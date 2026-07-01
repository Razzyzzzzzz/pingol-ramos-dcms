<?php
/**
 * Authentication endpoint.
 *   POST ?action=login            { email, password }        -> token + user
 *   GET  ?action=me                                          -> current user
 *   POST ?action=change-password  { current, new }           -> ok
 *   POST ?action=forgot-password  { email }                  -> reset token (dev)
 *   POST ?action=reset-password   { token, password }        -> ok
 */

require_once __DIR__ . '/../bootstrap.php';

$action = $_GET['action'] ?? 'login';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'login':
        if ($method !== 'POST') sendResponse(false, 'Method not allowed', null, 405);
        login();
        break;
    case 'me':
        $user = requireAuth();
        me($user);
        break;
    case 'change-password':
        $user = requireAuth();
        changePassword($user);
        break;
    case 'forgot-password':
        forgotPassword();
        break;
    case 'reset-password':
        resetPassword();
        break;
    default:
        sendResponse(false, 'Unknown action', null, 404);
}

function login(): void
{
    global $conn;
    $body     = getJsonBody();
    $email    = trim($body['email'] ?? '');
    $password = (string)($body['password'] ?? '');

    if ($email === '' || $password === '') {
        sendResponse(false, 'Email and password are required');
    }

    $stmt = $conn->prepare('SELECT id, name, email, password_hash, role, status FROM users WHERE email = ? LIMIT 1');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Same generic message whether the email or the password is wrong.
    if (!$user || !password_verify($password, $user['password_hash'])) {
        sendResponse(false, 'Invalid email or password', null, 401);
    }
    if ($user['status'] !== 'active') {
        sendResponse(false, 'This account has been deactivated', null, 403);
    }

    $token = jwt_encode([
        'sub'   => (int)$user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
    ]);

    unset($user['password_hash'], $user['status']);
    sendResponse(true, 'Signed in', ['token' => $token, 'user' => $user]);
}

function me(array $user): void
{
    global $conn;
    $stmt = $conn->prepare('SELECT id, name, email, role, phone, avatar, status FROM users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $user['id']);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) sendResponse(false, 'User not found', null, 404);
    sendResponse(true, '', $row);
}

function changePassword(array $user): void
{
    global $conn;
    $body    = getJsonBody();
    $current = (string)($body['current'] ?? '');
    $new     = (string)($body['new'] ?? '');

    if (strlen($new) < 6) sendResponse(false, 'New password must be at least 6 characters');

    $stmt = $conn->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $user['id']);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || !password_verify($current, $row['password_hash'])) {
        sendResponse(false, 'Current password is incorrect');
    }

    $hash = password_hash($new, PASSWORD_BCRYPT);
    $stmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $stmt->bind_param('si', $hash, $user['id']);
    $stmt->execute();
    $stmt->close();

    sendResponse(true, 'Password updated');
}

function forgotPassword(): void
{
    global $conn;
    $body  = getJsonBody();
    $email = trim($body['email'] ?? '');
    if ($email === '') sendResponse(false, 'Email is required');

    $stmt = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $exists = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Always respond success to avoid leaking which emails are registered.
    if (!$exists) {
        sendResponse(true, 'If that email is registered, a reset link has been sent');
    }

    $token   = bin2hex(random_bytes(24));
    $expires = date('Y-m-d H:i:s', time() + 3600);
    $stmt = $conn->prepare('INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)');
    $stmt->bind_param('sss', $email, $token, $expires);
    $stmt->execute();
    $stmt->close();

    // In production, email this token as a link instead of returning it.
    // Returned here so the flow is testable without a mail server.
    sendResponse(true, 'Reset token generated', ['reset_token' => $token]);
}

function resetPassword(): void
{
    global $conn;
    $body     = getJsonBody();
    $token    = trim($body['token'] ?? '');
    $password = (string)($body['password'] ?? '');
    if ($token === '' || strlen($password) < 6) {
        sendResponse(false, 'A valid token and a 6+ character password are required');
    }

    $stmt = $conn->prepare('SELECT id, email FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW() LIMIT 1');
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $reset = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$reset) sendResponse(false, 'This reset link is invalid or has expired');

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE email = ?');
    $stmt->bind_param('ss', $hash, $reset['email']);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare('UPDATE password_resets SET used = 1 WHERE id = ?');
    $stmt->bind_param('i', $reset['id']);
    $stmt->execute();
    $stmt->close();

    sendResponse(true, 'Password has been reset');
}
