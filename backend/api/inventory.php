<?php
/**
 * Inventory endpoint.
 *   GET    /api/inventory.php?search=&category=&filter=&page=&limit=
 *          filter = low | out | expired  (optional)
 *   GET    /api/inventory.php?view=summary   -> counts for cards
 *   POST   /api/inventory.php                -> create
 *   PUT    /api/inventory.php?id=5           -> update
 *   DELETE /api/inventory.php?id=5           -> delete
 */

require_once __DIR__ . '/../bootstrap.php';
$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
global $conn;

if ($method === 'GET' && ($_GET['view'] ?? '') === 'summary') { summary(); }

switch ($method) {
    case 'GET':    listItems(); break;
    case 'POST':   createItem(); break;
    case 'PUT':    updateItem((int)($_GET['id'] ?? 0)); break;
    case 'DELETE': deleteItem($user, (int)($_GET['id'] ?? 0)); break;
    default:       sendResponse(false, 'Method not allowed', null, 405);
}

function summary(): void
{
    global $conn;
    $q = fn($sql) => (int)($conn->query($sql)->fetch_row()[0]);
    sendResponse(true, '', [
        'total'    => $q('SELECT COUNT(*) FROM inventory WHERE status="active"'),
        'low'      => $q('SELECT COUNT(*) FROM inventory WHERE quantity>0 AND quantity<=reorder_level'),
        'out'      => $q('SELECT COUNT(*) FROM inventory WHERE quantity<=0'),
        'expiring' => $q('SELECT COUNT(*) FROM inventory WHERE expiration_date IS NOT NULL AND expiration_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY)'),
    ]);
}

function listItems(): void
{
    global $conn;
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = min(200, max(1, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $conds = [];
    if (!empty($_GET['search'])) {
        $like = '%' . sanitize($conn, $_GET['search']) . '%';
        $conds[] = "(i.product_name LIKE '$like' OR i.category LIKE '$like')";
    }
    if (!empty($_GET['category'])) {
        $conds[] = "i.category = '" . sanitize($conn, $_GET['category']) . "'";
    }
    switch ($_GET['filter'] ?? '') {
        case 'low':     $conds[] = 'i.quantity > 0 AND i.quantity <= i.reorder_level'; break;
        case 'out':     $conds[] = 'i.quantity <= 0'; break;
        case 'expired': $conds[] = 'i.expiration_date IS NOT NULL AND i.expiration_date < CURDATE()'; break;
    }
    $where = $conds ? 'WHERE ' . implode(' AND ', $conds) : '';

    $total = (int)($conn->query("SELECT COUNT(*) FROM inventory i $where")->fetch_row()[0]);

    $rows = [];
    $res = $conn->query(
        "SELECT i.*, s.name AS supplier_name,
                CASE
                  WHEN i.quantity <= 0 THEN 'out'
                  WHEN i.quantity <= i.reorder_level THEN 'low'
                  ELSE 'ok'
                END AS stock_state,
                (i.expiration_date IS NOT NULL AND i.expiration_date < CURDATE()) AS is_expired
         FROM inventory i
         LEFT JOIN suppliers s ON s.id = i.supplier_id
         $where ORDER BY i.product_name ASC LIMIT $limit OFFSET $offset"
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

function readItemBody(): array
{
    $b = getJsonBody();
    $name = trim($b['product_name'] ?? '');
    if ($name === '') sendResponse(false, 'Product name is required');
    return [
        'name'      => $name,
        'category'  => $b['category'] ?? null,
        'quantity'  => (int)($b['quantity'] ?? 0),
        'unit'      => $b['unit'] ?? 'pcs',
        'reorder'   => (int)($b['reorder_level'] ?? 10),
        'purchase'  => (float)($b['purchase_price'] ?? 0),
        'selling'   => (float)($b['selling_price'] ?? 0),
        'supplier'  => !empty($b['supplier_id']) ? (int)$b['supplier_id'] : null,
        'expiry'    => !empty($b['expiration_date']) ? $b['expiration_date'] : null,
    ];
}

function createItem(): void
{
    global $conn;
    $d = readItemBody();
    $stmt = $conn->prepare(
        'INSERT INTO inventory
           (product_name, category, quantity, unit, reorder_level,
            purchase_price, selling_price, supplier_id, expiration_date)
         VALUES (?,?,?,?,?,?,?,?,?)'
    );
    $stmt->bind_param(
        'ssisiddis',
        $d['name'], $d['category'], $d['quantity'], $d['unit'], $d['reorder'],
        $d['purchase'], $d['selling'], $d['supplier'], $d['expiry']
    );
    $stmt->execute();
    $id = $stmt->insert_id;
    $stmt->close();

    if ($d['quantity'] <= $d['reorder']) {
        pushNotification($conn, null, 'inventory', 'Low stock', $d['name'] . ' is at or below reorder level', '/inventory');
    }
    sendResponse(true, 'Item added', ['id' => $id], 201);
}

function updateItem(int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid item');
    $d = readItemBody();
    $stmt = $conn->prepare(
        'UPDATE inventory SET
           product_name=?, category=?, quantity=?, unit=?, reorder_level=?,
           purchase_price=?, selling_price=?, supplier_id=?, expiration_date=?
         WHERE id=?'
    );
    $stmt->bind_param(
        'ssisiddisi',
        $d['name'], $d['category'], $d['quantity'], $d['unit'], $d['reorder'],
        $d['purchase'], $d['selling'], $d['supplier'], $d['expiry'], $id
    );
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Item updated');
}

function deleteItem(array $user, int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid item');
    $stmt = $conn->prepare('DELETE FROM inventory WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Item deleted');
}
