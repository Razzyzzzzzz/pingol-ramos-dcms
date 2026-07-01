<?php
/**
 * Notifications endpoint — per-user feed (plus broadcasts where user_id IS NULL).
 *   GET  /api/notifications.php?limit=20   -> recent notifications + unread count
 *   GET  /api/notifications.php?view=count -> unread count only
 *   PUT  /api/notifications.php?id=5       -> mark one read
 *   PUT  /api/notifications.php?all=1      -> mark all read
 *   DELETE /api/notifications.php?id=5     -> remove one
 */

require_once __DIR__ . '/../bootstrap.php';
$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
global $conn;

$uid = (int)$user['id'];

switch ($method) {
    case 'GET':
        if (($_GET['view'] ?? '') === 'count') unreadCount($uid);
        else                                   listNotifications($uid);
        break;
    case 'PUT':
        if (!empty($_GET['all'])) markAllRead($uid);
        else                      markRead($uid, (int)($_GET['id'] ?? 0));
        break;
    case 'DELETE': removeNotification($uid, (int)($_GET['id'] ?? 0)); break;
    default:       sendResponse(false, 'Method not allowed', null, 405);
}

/** Rows addressed to this user OR broadcast to everyone (user_id IS NULL). */
function scopeSql(): string
{
    return '(user_id = ? OR user_id IS NULL)';
}

function listNotifications(int $uid): void
{
    global $conn;
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));

    $stmt = $conn->prepare(
        'SELECT id, type, title, message, link, is_read, created_at
         FROM notifications WHERE ' . scopeSql() . '
         ORDER BY created_at DESC, id DESC LIMIT ?'
    );
    $stmt->bind_param('ii', $uid, $limit);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    $stmt->close();

    $stmt = $conn->prepare('SELECT COUNT(*) FROM notifications WHERE ' . scopeSql() . ' AND is_read = 0');
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $unread = (int)($stmt->get_result()->fetch_row()[0]);
    $stmt->close();

    sendResponse(true, '', ['items' => $rows, 'unread' => $unread]);
}

function unreadCount(int $uid): void
{
    global $conn;
    $stmt = $conn->prepare('SELECT COUNT(*) FROM notifications WHERE ' . scopeSql() . ' AND is_read = 0');
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $unread = (int)($stmt->get_result()->fetch_row()[0]);
    $stmt->close();
    sendResponse(true, '', ['unread' => $unread]);
}

function markRead(int $uid, int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid notification');
    $stmt = $conn->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND ' . scopeSql());
    $stmt->bind_param('ii', $id, $uid);
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Marked as read');
}

function markAllRead(int $uid): void
{
    global $conn;
    $stmt = $conn->prepare('UPDATE notifications SET is_read = 1 WHERE ' . scopeSql() . ' AND is_read = 0');
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'All notifications marked as read');
}

function removeNotification(int $uid, int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid notification');
    // Only remove rows addressed to this user (never delete a broadcast for everyone).
    $stmt = $conn->prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?');
    $stmt->bind_param('ii', $id, $uid);
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Notification removed');
}
