<?php
/**
 * Settings endpoint — clinic information + system preferences (key/value store).
 *   GET /api/settings.php          -> all settings as an object { key: value }
 *   PUT /api/settings.php          -> bulk upsert (admin only)  { key: value, ... }
 *
 * Any authenticated user can read settings (clinic name/logo appear across the
 * UI). Only an admin can change them.
 */

require_once __DIR__ . '/../bootstrap.php';
$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
global $conn;

switch ($method) {
    case 'GET': getSettings(); break;
    case 'PUT': updateSettings($user); break;
    default:    sendResponse(false, 'Method not allowed', null, 405);
}

function getSettings(): void
{
    global $conn;
    $out = [];
    $res = $conn->query('SELECT setting_key, setting_value FROM settings');
    while ($row = $res->fetch_assoc()) {
        $out[$row['setting_key']] = $row['setting_value'];
    }
    sendResponse(true, '', $out);
}

function updateSettings(array $user): void
{
    global $conn;
    if (($user['role'] ?? '') !== 'admin') {
        sendResponse(false, 'Only an admin can change clinic settings', null, 403);
    }

    $body = getJsonBody();
    if (!$body) sendResponse(false, 'Nothing to update');

    // Only allow known keys to be written.
    $allowedKeys = [
        'clinic_name', 'clinic_address', 'clinic_phone', 'clinic_email',
        'operating_hours', 'currency', 'appointment_slot_minutes',
    ];

    $stmt = $conn->prepare(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
    );

    $saved = 0;
    foreach ($body as $key => $value) {
        if (!in_array($key, $allowedKeys, true)) continue;
        $val = is_scalar($value) ? (string)$value : json_encode($value);
        $stmt->bind_param('ss', $key, $val);
        $stmt->execute();
        $saved++;
    }
    $stmt->close();

    if ($saved === 0) sendResponse(false, 'No valid settings were provided');
    sendResponse(true, 'Settings saved');
}
