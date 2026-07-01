<?php
/**
 * Per-request bootstrap. Every endpoint under /api starts with:
 *     require_once __DIR__ . '/../bootstrap.php';
 * and then calls requireAuth() (optionally with allowed roles).
 *
 * Responsibilities: load config/db/jwt, apply CORS, answer preflight,
 * and expose the auth guard.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

// ---- CORS -------------------------------------------------------------------
$allowedOrigins = array_map('trim', explode(',', CORS_ORIGINS));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Preflight — respond and stop before any auth/DB work.
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Extract the bearer token from the Authorization header.
 */
function getBearerToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$header && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header  = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
        return trim($m[1]);
    }
    return null;
}

/**
 * Require a valid JWT. Optionally restrict to specific roles.
 * On success returns the decoded claims (id, name, email, role).
 * On failure sends 401/403 and exits.
 */
function requireAuth(array $roles = []): array
{
    $token = getBearerToken();
    if (!$token) {
        sendResponse(false, 'Authentication required', null, 401);
    }
    $claims = jwt_decode($token);
    if (!$claims || empty($claims['sub'])) {
        sendResponse(false, 'Invalid or expired session', null, 401);
    }
    if ($roles && !in_array($claims['role'] ?? '', $roles, true)) {
        sendResponse(false, 'You do not have permission to perform this action', null, 403);
    }
    return [
        'id'    => (int)$claims['sub'],
        'name'  => $claims['name']  ?? '',
        'email' => $claims['email'] ?? '',
        'role'  => $claims['role']  ?? 'staff',
    ];
}

/**
 * Create an in-app notification (broadcast when $userId is null).
 */
function pushNotification(mysqli $conn, ?int $userId, string $type, string $title, string $message = '', ?string $link = null): void
{
    $stmt = $conn->prepare(
        'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('issss', $userId, $type, $title, $message, $link);
    $stmt->execute();
    $stmt->close();
}
