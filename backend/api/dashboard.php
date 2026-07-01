<?php
/**
 * Dashboard endpoint — returns everything the dashboard needs in one request:
 *   GET /api/dashboard.php  -> { cards, charts, recent }
 */

require_once __DIR__ . '/../bootstrap.php';
requireAuth();

global $conn;

// Small helper for single-value aggregate queries.
function scalar(mysqli $conn, string $sql): float
{
    $res = $conn->query($sql);
    $row = $res ? $res->fetch_row() : [0];
    return (float)($row[0] ?? 0);
}

// ---- Summary cards ----------------------------------------------------------
$cards = [
    'total_patients'         => (int)scalar($conn, 'SELECT COUNT(*) FROM patients'),
    'total_appointments'     => (int)scalar($conn, 'SELECT COUNT(*) FROM appointments'),
    'today_appointments'     => (int)scalar($conn, 'SELECT COUNT(*) FROM appointments WHERE appointment_date = CURDATE() AND status <> "cancelled"'),
    'upcoming_appointments'  => (int)scalar($conn, 'SELECT COUNT(*) FROM appointments WHERE appointment_date > CURDATE() AND status <> "cancelled"'),
    'pending_appointments'   => (int)scalar($conn, 'SELECT COUNT(*) FROM appointments WHERE status = "pending"'),
    'completed_appointments' => (int)scalar($conn, 'SELECT COUNT(*) FROM appointments WHERE status = "completed"'),
    'monthly_revenue'        => scalar($conn, 'SELECT COALESCE(SUM(amount),0) FROM payments WHERE YEAR(payment_date)=YEAR(CURDATE()) AND MONTH(payment_date)=MONTH(CURDATE())'),
    'monthly_expenses'       => scalar($conn, 'SELECT COALESCE(SUM(amount),0) FROM expenses WHERE YEAR(expense_date)=YEAR(CURDATE()) AND MONTH(expense_date)=MONTH(CURDATE())'),
    'inventory_items'        => (int)scalar($conn, 'SELECT COUNT(*) FROM inventory WHERE status = "active"'),
    'low_stock'             => (int)scalar($conn, 'SELECT COUNT(*) FROM inventory WHERE quantity > 0 AND quantity <= reorder_level'),
    'out_of_stock'          => (int)scalar($conn, 'SELECT COUNT(*) FROM inventory WHERE quantity <= 0'),
];
$cards['net_income'] = $cards['monthly_revenue'] - $cards['monthly_expenses'];

// ---- Charts -----------------------------------------------------------------

// Revenue vs expenses, last 6 months (including current).
$revExp = [];
for ($i = 5; $i >= 0; $i--) {
    $label = date('M', strtotime("-$i month"));
    $ym    = date('Y-m', strtotime("-$i month"));
    $rev = scalar($conn, "SELECT COALESCE(SUM(amount),0) FROM payments WHERE DATE_FORMAT(payment_date,'%Y-%m')='$ym'");
    $exp = scalar($conn, "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE DATE_FORMAT(expense_date,'%Y-%m')='$ym'");
    $revExp[] = ['month' => $label, 'revenue' => $rev, 'expenses' => $exp];
}

// Appointment counts by status.
$apptStatus = [];
$res = $conn->query('SELECT status, COUNT(*) c FROM appointments GROUP BY status');
$map = ['pending' => 0, 'approved' => 0, 'completed' => 0, 'cancelled' => 0];
while ($row = $res->fetch_assoc()) {
    $map[$row['status']] = (int)$row['c'];
}
foreach ($map as $status => $count) {
    $apptStatus[] = ['status' => ucfirst($status), 'count' => $count];
}

// Patient growth, last 6 months.
$growth = [];
for ($i = 5; $i >= 0; $i--) {
    $label = date('M', strtotime("-$i month"));
    $ym    = date('Y-m', strtotime("-$i month"));
    $n = scalar($conn, "SELECT COUNT(*) FROM patients WHERE DATE_FORMAT(created_at,'%Y-%m')='$ym'");
    $growth[] = ['month' => $label, 'patients' => (int)$n];
}

// Inventory status split.
$inventoryStatus = [
    ['label' => 'In Stock',     'value' => (int)scalar($conn, 'SELECT COUNT(*) FROM inventory WHERE quantity > reorder_level')],
    ['label' => 'Low Stock',    'value' => $cards['low_stock']],
    ['label' => 'Out of Stock', 'value' => $cards['out_of_stock']],
];

// ---- Recent activity --------------------------------------------------------
$recentAppointments = [];
$res = $conn->query(
    'SELECT a.id, a.appointment_code, a.appointment_date, a.start_time, a.status,
            CONCAT(p.first_name," ",p.last_name) patient, d.name dentist, s.name service
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN dentists d ON d.id = a.dentist_id
     LEFT JOIN services s ON s.id = a.service_id
     ORDER BY a.created_at DESC LIMIT 6'
);
while ($row = $res->fetch_assoc()) $recentAppointments[] = $row;

$newPatients = [];
$res = $conn->query(
    'SELECT id, patient_code, CONCAT(first_name," ",last_name) name, contact_number, created_at
     FROM patients ORDER BY created_at DESC LIMIT 6'
);
while ($row = $res->fetch_assoc()) $newPatients[] = $row;

$recentPayments = [];
$res = $conn->query(
    'SELECT pay.id, pay.amount, pay.payment_method, pay.payment_date, pay.description,
            CONCAT(p.first_name," ",p.last_name) patient
     FROM payments pay
     LEFT JOIN patients p ON p.id = pay.patient_id
     ORDER BY pay.created_at DESC LIMIT 6'
);
while ($row = $res->fetch_assoc()) $recentPayments[] = $row;

sendResponse(true, '', [
    'cards'  => $cards,
    'charts' => [
        'revenue_expenses' => $revExp,
        'appointment_status' => $apptStatus,
        'patient_growth' => $growth,
        'inventory_status' => $inventoryStatus,
    ],
    'recent' => [
        'appointments' => $recentAppointments,
        'patients'     => $newPatients,
        'payments'     => $recentPayments,
    ],
]);
