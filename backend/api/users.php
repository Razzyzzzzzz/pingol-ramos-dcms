<?php
/**
 * User management endpoint — admin only.
 *   GET    /api/users.php?search=&role=&page=&limit=   -> list users
 *   GET    /api/users.php?id=5                         -> single user
 *   POST   /api/users.php                              -> create user
 *   PUT    /api/users.php?id=5                         -> update (name/email/role/phone/status)
 *   PUT    /api/users.php?id=5&action=password         -> set a new password
 *   DELETE /api/users.php?id=5                         -> delete (cannot delete self)
 */

require_once __DIR__ . '/../bootstrap.php';
$user   = requireAuth(['admin']);       // whole module is admin-gated
$method = $_SERVER['REQUEST_METHOD'];
global $conn;

const USER_ROLES = ['admin','dentist','staff'];

switch ($method) {
    case 'GET':
        if (!empty($_GET['id'])) getUser((int)$_GET['id']);
        else                     listUsers();
        break;
    case 'POST': createUser(); break;
    case 'PUT':
        if (($_GET['action'] ?? '') === 'password') setPassword((int)($_GET['id'] ?? 0));
        else                                        updateUser((int)($_GET['id'] ?? 0));
        break;
    case 'DELETE': deleteUser($user, (int)($_GET['id'] ?? 0)); break;
    default:       sendResponse(false, 'Method not allowed', null, 405);
}

function listUsers(): void
{
    global $conn;
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = min(200, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $conds = [];
    if (!empty($_GET['search'])) {
        $like = '%' . sanitize($conn, $_GET['search']) . '%';
        $conds[] = "(name LIKE '$like' OR email LIKE '$like')";
    }
    if (!empty($_GET['role']) && in_array($_GET['role'], USER_ROLES, true)) {
        $conds[] = "role = '" . sanitize($conn, $_GET['role']) . "'";
    }
    $where = $conds ? 'WHERE ' . implode(' AND ', $conds) : '';

    $total = (int)($conn->query("SELECT COUNT(*) FROM users $where")->fetch_row()[0]);

    $rows = [];
    $res = $conn->query(
        "SELECT id, name, email, role, phone, status, created_at
         FROM users $where ORDER BY name ASC LIMIT $limit OFFSET $offset"
    );
    while ($row = $res->fetch_assoc()) $rows[] = $row;

    sendResponse(true, '', [
        'items' => $rows,
        'total' => $total,
        'page'  => $page,
        'limit' => $limit,
        'pages' => (int)ceil($total / $limit),
    ]);
}

function getUser(int $id): void
{
    global $conn;
    $stmt = $conn->prepare('SELECT id, name, email, role, phone, status, created_at FROM users WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) sendResponse(false, 'User not found', null, 404);
    sendResponse(true, '', $row);
}

function createUser(): void
{
    global $conn;
    $b     = getJsonBody();
    $name  = trim($b['name'] ?? '');
    $email = trim($b['email'] ?? '');
    $pass  = (string)($b['password'] ?? '');

    if ($name === '' || $email === '') sendResponse(false, 'Name and email are required');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) sendResponse(false, 'A valid email is required');
    if (strlen($pass) < 6) sendResponse(false, 'Password must be at least 6 characters');

    $role   = whitelist($b['role'] ?? 'staff', USER_ROLES, 'staff');
    $phone  = $b['phone'] ?? null;
    $status = whitelist($b['status'] ?? 'active', ['active','inactive'], 'active');

    // Unique email guard (also enforced by the DB unique key).
    $stmt = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) { $stmt->close(); sendResponse(false, 'That email is already in use'); }
    $stmt->close();

    $hash = password_hash($pass, PASSWORD_BCRYPT);
    $stmt = $conn->prepare(
        'INSERT INTO users (name, email, password_hash, role, phone, status) VALUES (?,?,?,?,?,?)'
    );
    $stmt->bind_param('ssssss', $name, $email, $hash, $role, $phone, $status);
    $stmt->execute();
    $id = $stmt->insert_id;
    $stmt->close();

    sendResponse(true, 'User created', ['id' => $id], 201);
}

function updateUser(int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid user');
    $b     = getJsonBody();
    $name  = trim($b['name'] ?? '');
    $email = trim($b['email'] ?? '');
    if ($name === '' || $email === '') sendResponse(false, 'Name and email are required');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) sendResponse(false, 'A valid email is required');

    $role   = whitelist($b['role'] ?? 'staff', USER_ROLES, 'staff');
    $phone  = $b['phone'] ?? null;
    $status = whitelist($b['status'] ?? 'active', ['active','inactive'], 'active');

    // Email must stay unique across other users.
    $stmt = $conn->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
    $stmt->bind_param('si', $email, $id);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) { $stmt->close(); sendResponse(false, 'That email is already in use'); }
    $stmt->close();

    $stmt = $conn->prepare('UPDATE users SET name=?, email=?, role=?, phone=?, status=? WHERE id=?');
    $stmt->bind_param('sssssi', $name, $email, $role, $phone, $status, $id);
    $stmt->execute();
    $stmt->close();

    sendResponse(true, 'User updated');
}

function setPassword(int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid user');
    $b    = getJsonBody();
    $pass = (string)($b['password'] ?? '');
    if (strlen($pass) < 6) sendResponse(false, 'Password must be at least 6 characters');

    $hash = password_hash($pass, PASSWORD_BCRYPT);
    $stmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $stmt->bind_param('si', $hash, $id);
    $stmt->execute();
    $stmt->close();

    sendResponse(true, 'Password updated');
}

function deleteUser(array $current, int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid user');
    if ($id === (int)$current['id']) sendResponse(false, 'You cannot delete your own account');

    $stmt = $conn->prepare('DELETE FROM users WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();

    sendResponse(true, 'User deleted');
}
