<?php
/**
 * Expenses endpoint.
 *   GET    /api/expenses.php?search=&category=&from=&to=&page=&limit=
 *   GET    /api/expenses.php?view=summary   -> totals + by-category + 6-month trend
 *   POST   /api/expenses.php                -> create
 *   PUT    /api/expenses.php?id=5           -> update
 *   DELETE /api/expenses.php?id=5           -> delete  (admin only)
 */

require_once __DIR__ . '/../bootstrap.php';
$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
global $conn;

const EXPENSE_CATEGORIES = ['equipment','supplies','utilities','rent','salaries','maintenance','other'];

if ($method === 'GET' && ($_GET['view'] ?? '') === 'summary') { summary(); }

switch ($method) {
    case 'GET':    listExpenses(); break;
    case 'POST':   createExpense($user); break;
    case 'PUT':    updateExpense((int)($_GET['id'] ?? 0)); break;
    case 'DELETE': deleteExpense($user, (int)($_GET['id'] ?? 0)); break;
    default:       sendResponse(false, 'Method not allowed', null, 405);
}

function summary(): void
{
    global $conn;
    $scalar = fn($sql) => (float)($conn->query($sql)->fetch_row()[0] ?? 0);

    $byCategory = [];
    $res = $conn->query(
        "SELECT category, SUM(amount) AS total FROM expenses
         WHERE MONTH(expense_date)=MONTH(CURDATE()) AND YEAR(expense_date)=YEAR(CURDATE())
         GROUP BY category"
    );
    while ($r = $res->fetch_assoc()) $byCategory[] = $r;

    // 6-month trend (oldest -> newest)
    $trend = [];
    $res = $conn->query(
        "SELECT DATE_FORMAT(expense_date, '%Y-%m') AS ym,
                DATE_FORMAT(expense_date, '%b') AS label,
                SUM(amount) AS total
         FROM expenses
         WHERE expense_date >= DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'), INTERVAL 5 MONTH)
         GROUP BY ym, label ORDER BY ym ASC"
    );
    while ($r = $res->fetch_assoc()) $trend[] = $r;

    sendResponse(true, '', [
        'this_month' => $scalar("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE MONTH(expense_date)=MONTH(CURDATE()) AND YEAR(expense_date)=YEAR(CURDATE())"),
        'this_year'  => $scalar("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE YEAR(expense_date)=YEAR(CURDATE())"),
        'all_time'   => $scalar("SELECT COALESCE(SUM(amount),0) FROM expenses"),
        'by_category'=> $byCategory,
        'trend'      => $trend,
    ]);
}

function listExpenses(): void
{
    global $conn;
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = min(200, max(1, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $conds = [];
    if (!empty($_GET['search'])) {
        $like = '%' . sanitize($conn, $_GET['search']) . '%';
        $conds[] = "(e.title LIKE '$like' OR e.notes LIKE '$like')";
    }
    if (!empty($_GET['category']) && in_array($_GET['category'], EXPENSE_CATEGORIES, true)) {
        $conds[] = "e.category = '" . sanitize($conn, $_GET['category']) . "'";
    }
    if (!empty($_GET['from'])) $conds[] = "e.expense_date >= '" . sanitize($conn, $_GET['from']) . "'";
    if (!empty($_GET['to']))   $conds[] = "e.expense_date <= '" . sanitize($conn, $_GET['to']) . "'";
    $where = $conds ? 'WHERE ' . implode(' AND ', $conds) : '';

    $total = (int)($conn->query("SELECT COUNT(*) FROM expenses e $where")->fetch_row()[0]);
    $sum   = (float)($conn->query("SELECT COALESCE(SUM(amount),0) FROM expenses e $where")->fetch_row()[0]);

    $rows = [];
    $res = $conn->query(
        "SELECT e.*, u.name AS created_by_name
         FROM expenses e
         LEFT JOIN users u ON u.id = e.created_by
         $where ORDER BY e.expense_date DESC, e.id DESC LIMIT $limit OFFSET $offset"
    );
    while ($row = $res->fetch_assoc()) $rows[] = $row;

    sendResponse(true, '', [
        'items'          => $rows,
        'total'          => $total,
        'filtered_total' => $sum,
        'page'           => $page,
        'limit'          => $limit,
        'pages'          => (int)ceil($total / $limit),
    ]);
}

function readExpenseBody(): array
{
    $b = getJsonBody();
    $title = trim($b['title'] ?? '');
    if ($title === '') sendResponse(false, 'Title is required');
    $amount = (float)($b['amount'] ?? 0);
    if ($amount <= 0) sendResponse(false, 'Amount must be greater than zero');

    return [
        'category' => whitelist($b['category'] ?? 'other', EXPENSE_CATEGORIES, 'other'),
        'title'    => $title,
        'amount'   => $amount,
        'date'     => !empty($b['expense_date']) ? $b['expense_date'] : date('Y-m-d'),
        'notes'    => $b['notes'] ?? null,
    ];
}

function createExpense(array $user): void
{
    global $conn;
    $d = readExpenseBody();
    $stmt = $conn->prepare(
        'INSERT INTO expenses (category, title, amount, expense_date, notes, created_by)
         VALUES (?,?,?,?,?,?)'
    );
    $stmt->bind_param('ssdssi', $d['category'], $d['title'], $d['amount'], $d['date'], $d['notes'], $user['id']);
    $stmt->execute();
    $id = $stmt->insert_id;
    $stmt->close();
    sendResponse(true, 'Expense recorded', ['id' => $id], 201);
}

function updateExpense(int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid expense');
    $d = readExpenseBody();
    $stmt = $conn->prepare(
        'UPDATE expenses SET category=?, title=?, amount=?, expense_date=?, notes=? WHERE id=?'
    );
    $stmt->bind_param('ssdssi', $d['category'], $d['title'], $d['amount'], $d['date'], $d['notes'], $id);
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Expense updated');
}

function deleteExpense(array $user, int $id): void
{
    global $conn;
    if (($user['role'] ?? '') !== 'admin') sendResponse(false, 'Only an admin can delete expenses', null, 403);
    if (!$id) sendResponse(false, 'Invalid expense');
    $stmt = $conn->prepare('DELETE FROM expenses WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Expense deleted');
}
