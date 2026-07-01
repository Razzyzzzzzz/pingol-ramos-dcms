<?php
/**
 * Database connection (MySQLi) + shared response/input helpers.
 * Mirrors the house pattern: never call real_escape_string / echo raw JSON
 * directly — always go through sanitize() and sendResponse().
 */

require_once __DIR__ . '/config.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
    $conn->set_charset('utf8mb4');
} catch (\Throwable $e) {
    error_log('DB connection failed: ' . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

/**
 * Escape a string for safe use in a query. Prefer prepared statements for all
 * writes; use this only for LIKE fragments / dynamic-but-whitelisted values.
 */
function sanitize(mysqli $conn, $value): string
{
    return $conn->real_escape_string(trim((string)$value));
}

/**
 * Send a JSON response and stop. Sets the status code and Content-Type.
 */
function sendResponse(bool $success, string $message = '', $data = null, int $httpCode = 200): void
{
    if (!$success && $httpCode === 200) {
        $httpCode = 400; // sensible default for failures
    }
    http_response_code($httpCode);
    header('Content-Type: application/json; charset=utf-8');
    $payload = ['success' => $success, 'message' => $message];
    if ($data !== null) {
        $payload['data'] = $data;
    }
    echo json_encode($payload);
    exit;
}

/**
 * Read and decode the JSON request body (for POST/PUT from the React client).
 * Falls back to $_POST if the body is form-encoded.
 */
function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return $_POST ?? [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : ($_POST ?? []);
}

/**
 * Whitelist helper — return $value only if it is in $allowed, else $default.
 * Use for enum columns, sort directions, and any user-supplied identifier.
 */
function whitelist($value, array $allowed, $default = null)
{
    return in_array($value, $allowed, true) ? $value : $default;
}
