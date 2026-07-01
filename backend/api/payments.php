<?php
/**
 * Payments & Revenue endpoint.
 *   GET    /api/payments.php?search=&method=&from=&to=&page=&limit=   -> payment history
 *   GET    /api/payments.php?view=revenue                            -> daily/weekly/monthly/annual + net income
 *   GET    /api/payments.php?view=revenue&range=custom&from=&to=      -> custom range totals
 *   POST   /api/payments.php                                         -> record payment
 *   PUT    /api/payments.php?id=5                                    -> update
 *   DELETE /api/payments.php?id=5                                    -> delete (admin only)
 */

require_once __DIR__ . '/../bootstrap.php';
$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
global $conn;

const PAYMENT_METHODS = ['cash','card','gcash','bank_transfer','other'];

if ($method === 'GET' && ($_GET['view'] ?? '') === 'revenue') { revenue(); }

switch ($method) {
    case 'GET':    listPayments(); break;
    case 'POST':   createPayment($user); break;
    case 'PUT':    updatePayment((int)($_GET['id'] ?? 0)); break;
    case 'DELETE': deletePayment($user, (int)($_GET['id'] ?? 0)); break;
    default:       sendResponse(false, 'Method not allowed', null, 405);
}

function revenue(): void
{
    global $conn;
    $scalar = fn($sql) => (float)($conn->query($sql)->fetch_row()[0] ?? 0);

    // Headline totals
    $daily   = $scalar("SELECT COALESCE(SUM(amount),0) FROM payments WHERE payment_date = CURDATE()");
    $weekly  = $scalar("SELECT COALESCE(SUM(amount),0) FROM payments WHERE YEARWEEK(payment_date,1) = YEARWEEK(CURDATE(),1)");
    $monthly = $scalar("SELECT COALESCE(SUM(amount),0) FROM payments WHERE MONTH(payment_date)=MONTH(CURDATE()) AND YEAR(payment_date)=YEAR(CURDATE())");
    $annual  = $scalar("SELECT COALESCE(SUM(amount),0) FROM payments WHERE YEAR(payment_date)=YEAR(CURDATE())");

    // Net income (this month): revenue - expenses
    $monthExpenses = $scalar("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE MONTH(expense_date)=MONTH(CURDATE()) AND YEAR(expense_date)=YEAR(CURDATE())");

    // 6-month revenue vs expenses trend
    $trend = [];
    $res = $conn->query(
        "SELECT ym, DATE_FORMAT(STR_TO_DATE(CONCAT(ym,'-01'),'%Y-%m-%d'), '%b') AS label,
                COALESCE(rev,0) AS revenue, COALESCE(exp,0) AS expenses
         FROM (
           SELECT DATE_FORMAT(d, '%Y-%m') AS ym FROM (
             SELECT CURDATE() - INTERVAL n MONTH AS d FROM (
               SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
             ) months
           ) base GROUP BY ym
         ) m
         LEFT JOIN (
           SELECT DATE_FORMAT(payment_date,'%Y-%m') ym, SUM(amount) rev
           FROM payments GROUP BY ym
         ) r USING (ym)
         LEFT JOIN (
           SELECT DATE_FORMAT(expense_date,'%Y-%m') ym, SUM(amount) exp
           FROM expenses GROUP BY ym
         ) e USING (ym)
         ORDER BY ym ASC"
    );
    while ($r = $res->fetch_assoc()) $trend[] = $r;

    // Revenue by payment method (this month)
    $byMethod = [];
    $res = $conn->query(
        "SELECT payment_method, SUM(amount) AS total, COUNT(*) AS count
         FROM payments
         WHERE MONTH(payment_date)=MONTH(CURDATE()) AND YEAR(payment_date)=YEAR(CURDATE())
         GROUP BY payment_method"
    );
    while ($r = $res->fetch_assoc()) $byMethod[] = $r;

    sendResponse(true, '', [
        'daily'          => $daily,
        'weekly'         => $weekly,
        'monthly'        => $monthly,
        'annual'         => $annual,
        'month_expenses' => $monthExpenses,
        'net_income'     => $monthly - $monthExpenses,
        'trend'          => $trend,
        'by_method'      => $byMethod,
    ]);
}

function listPayments(): void
{
    global $conn;
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = min(200, max(1, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $conds = [];
    if (!empty($_GET['search'])) {
        $like = '%' . sanitize($conn, $_GET['search']) . '%';
        $conds[] = "(p.description LIKE '$like' OR CONCAT(pt.first_name,' ',pt.last_name) LIKE '$like')";
    }
    if (!empty($_GET['method']) && in_array($_GET['method'], PAYMENT_METHODS, true)) {
        $conds[] = "p.payment_method = '" . sanitize($conn, $_GET['method']) . "'";
    }
    if (!empty($_GET['from'])) $conds[] = "p.payment_date >= '" . sanitize($conn, $_GET['from']) . "'";
    if (!empty($_GET['to']))   $conds[] = "p.payment_date <= '" . sanitize($conn, $_GET['to']) . "'";
    $where = $conds ? 'WHERE ' . implode(' AND ', $conds) : '';

    $total = (int)($conn->query("SELECT COUNT(*) FROM payments p LEFT JOIN patients pt ON pt.id=p.patient_id $where")->fetch_row()[0]);
    $sum   = (float)($conn->query("SELECT COALESCE(SUM(p.amount),0) FROM payments p LEFT JOIN patients pt ON pt.id=p.patient_id $where")->fetch_row()[0]);

    $rows = [];
    $res = $conn->query(
        "SELECT p.*,
                TRIM(CONCAT(COALESCE(pt.first_name,''),' ',COALESCE(pt.last_name,''))) AS patient_name,
                pt.patient_code,
                a.appointment_code
         FROM payments p
         LEFT JOIN patients pt ON pt.id = p.patient_id
         LEFT JOIN appointments a ON a.id = p.appointment_id
         $where ORDER BY p.payment_date DESC, p.id DESC LIMIT $limit OFFSET $offset"
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

function readPaymentBody(): array
{
    $b = getJsonBody();
    $amount = (float)($b['amount'] ?? 0);
    if ($amount <= 0) sendResponse(false, 'Amount must be greater than zero');

    return [
        'patient_id' => !empty($b['patient_id']) ? (int)$b['patient_id'] : null,
        'appt_id'    => !empty($b['appointment_id']) ? (int)$b['appointment_id'] : null,
        'amount'     => $amount,
        'method'     => whitelist($b['payment_method'] ?? 'cash', PAYMENT_METHODS, 'cash'),
        'date'       => !empty($b['payment_date']) ? $b['payment_date'] : date('Y-m-d'),
        'desc'       => $b['description'] ?? null,
    ];
}

function createPayment(array $user): void
{
    global $conn;
    $d = readPaymentBody();
    $stmt = $conn->prepare(
        'INSERT INTO payments (patient_id, appointment_id, amount, payment_method, payment_date, description, created_by)
         VALUES (?,?,?,?,?,?,?)'
    );
    $stmt->bind_param(
        'iidsssi',
        $d['patient_id'], $d['appt_id'], $d['amount'], $d['method'], $d['date'], $d['desc'], $user['id']
    );
    $stmt->execute();
    $id = $stmt->insert_id;
    $stmt->close();

    pushNotification($conn, null, 'payment', 'Payment received',
        '₱' . number_format($d['amount'], 2) . ' recorded', '/revenue');

    sendResponse(true, 'Payment recorded', ['id' => $id], 201);
}

function updatePayment(int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid payment');
    $d = readPaymentBody();
    $stmt = $conn->prepare(
        'UPDATE payments SET patient_id=?, appointment_id=?, amount=?, payment_method=?, payment_date=?, description=?
         WHERE id=?'
    );
    $stmt->bind_param(
        'iidsssi',
        $d['patient_id'], $d['appt_id'], $d['amount'], $d['method'], $d['date'], $d['desc'], $id
    );
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Payment updated');
}

function deletePayment(array $user, int $id): void
{
    global $conn;
    if (($user['role'] ?? '') !== 'admin') sendResponse(false, 'Only an admin can delete payments', null, 403);
    if (!$id) sendResponse(false, 'Invalid payment');
    $stmt = $conn->prepare('DELETE FROM payments WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Payment deleted');
}
