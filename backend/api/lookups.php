<?php
/**
 * Lookups endpoint — lightweight reference lists for dropdowns / filters.
 *   GET /api/lookups.php                 -> { dentists, services, suppliers }
 *   GET /api/lookups.php?only=dentists   -> single list (dentists|services|suppliers)
 *
 * Read-only; any authenticated user may read these.
 */

require_once __DIR__ . '/../bootstrap.php';
requireAuth();
global $conn;

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed', null, 405);
}

function fetchList(string $sql): array
{
    global $conn;
    $rows = [];
    $res  = $conn->query($sql);
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    return $rows;
}

$dentists = "SELECT id, name, specialization, status FROM dentists
             WHERE status='active' ORDER BY name ASC";
$services = "SELECT id, name, price, duration_minutes, status FROM services
             WHERE status='active' ORDER BY name ASC";
$suppliers = "SELECT id, name, contact_person, phone FROM suppliers ORDER BY name ASC";

switch ($_GET['only'] ?? '') {
    case 'dentists':  sendResponse(true, '', fetchList($dentists));  break;
    case 'services':  sendResponse(true, '', fetchList($services));  break;
    case 'suppliers': sendResponse(true, '', fetchList($suppliers)); break;
    default:
        sendResponse(true, '', [
            'dentists'  => fetchList($dentists),
            'services'  => fetchList($services),
            'suppliers' => fetchList($suppliers),
        ]);
}
