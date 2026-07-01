<?php
/**
 * Appointments endpoint.
 *   GET    /api/appointments.php?status=&dentist_id=&date=&from=&to=&search=&page=&limit=
 *   GET    /api/appointments.php?id=5
 *   POST   /api/appointments.php                      -> book (double-booking guarded)
 *   PUT    /api/appointments.php?id=5                 -> update / reschedule
 *   PUT    /api/appointments.php?id=5&action=status   -> change status only
 *   DELETE /api/appointments.php?id=5
 */

require_once __DIR__ . '/../bootstrap.php';
$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
global $conn;

switch ($method) {
    case 'GET':
        isset($_GET['id']) ? getOne((int)$_GET['id']) : listAppointments();
        break;
    case 'POST':
        createAppointment($user);
        break;
    case 'PUT':
        ($_GET['action'] ?? '') === 'status'
            ? changeStatus($user, (int)($_GET['id'] ?? 0))
            : updateAppointment((int)($_GET['id'] ?? 0));
        break;
    case 'DELETE':
        deleteAppointment($user, (int)($_GET['id'] ?? 0));
        break;
    default:
        sendResponse(false, 'Method not allowed', null, 405);
}

function baseSelect(): string
{
    return 'SELECT a.id, a.appointment_code, a.appointment_date, a.start_time, a.end_time,
                   a.status, a.notes, a.patient_id, a.dentist_id, a.service_id,
                   CONCAT(p.first_name," ",p.last_name) patient,
                   p.contact_number patient_contact,
                   d.name dentist, s.name service, s.price
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            LEFT JOIN dentists d ON d.id = a.dentist_id
            LEFT JOIN services s ON s.id = a.service_id';
}

function listAppointments(): void
{
    global $conn;
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = min(200, max(1, (int)($_GET['limit'] ?? 15)));
    $offset = ($page - 1) * $limit;

    $conds = [];
    $status = whitelist($_GET['status'] ?? '', ['pending', 'approved', 'completed', 'cancelled']);
    if ($status) $conds[] = "a.status = '$status'";

    if (!empty($_GET['dentist_id'])) {
        $conds[] = 'a.dentist_id = ' . (int)$_GET['dentist_id'];
    }
    if (!empty($_GET['date'])) {
        $d = sanitize($conn, $_GET['date']);
        $conds[] = "a.appointment_date = '$d'";
    }
    if (!empty($_GET['from'])) {
        $conds[] = "a.appointment_date >= '" . sanitize($conn, $_GET['from']) . "'";
    }
    if (!empty($_GET['to'])) {
        $conds[] = "a.appointment_date <= '" . sanitize($conn, $_GET['to']) . "'";
    }
    if (!empty($_GET['search'])) {
        $like = '%' . sanitize($conn, $_GET['search']) . '%';
        $conds[] = "(CONCAT(p.first_name,' ',p.last_name) LIKE '$like' OR a.appointment_code LIKE '$like')";
    }
    $where = $conds ? 'WHERE ' . implode(' AND ', $conds) : '';

    $total = (int)($conn->query("SELECT COUNT(*) FROM appointments a JOIN patients p ON p.id=a.patient_id $where")->fetch_row()[0]);

    $rows = [];
    $res = $conn->query(baseSelect() . " $where ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT $limit OFFSET $offset");
    while ($row = $res->fetch_assoc()) $rows[] = $row;

    sendResponse(true, '', [
        'items' => $rows,
        'total' => $total,
        'page'  => $page,
        'limit' => $limit,
        'pages' => (int)ceil($total / $limit),
    ]);
}

function getOne(int $id): void
{
    global $conn;
    $res = $conn->query(baseSelect() . ' WHERE a.id = ' . $id . ' LIMIT 1');
    $row = $res->fetch_assoc();
    if (!$row) sendResponse(false, 'Appointment not found', null, 404);
    sendResponse(true, '', $row);
}

/**
 * Returns true if the dentist already has a non-cancelled appointment at that
 * exact date + time (optionally excluding a given appointment id).
 */
function slotTaken(mysqli $conn, ?int $dentistId, string $date, string $time, int $excludeId = 0): bool
{
    if (!$dentistId) return false;
    $stmt = $conn->prepare(
        'SELECT id FROM appointments
         WHERE dentist_id = ? AND appointment_date = ? AND start_time = ?
           AND status <> "cancelled" AND id <> ? LIMIT 1'
    );
    $stmt->bind_param('issi', $dentistId, $date, $time, $excludeId);
    $stmt->execute();
    $exists = (bool)$stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $exists;
}

function nextAppointmentCode(mysqli $conn): string
{
    $n = (int)($conn->query('SELECT COALESCE(MAX(id),0)+1 FROM appointments')->fetch_row()[0]);
    return 'AP-' . str_pad((string)$n, 4, '0', STR_PAD_LEFT);
}

function createAppointment(array $user): void
{
    global $conn;
    $b = getJsonBody();

    $patientId = (int)($b['patient_id'] ?? 0);
    $dentistId = !empty($b['dentist_id']) ? (int)$b['dentist_id'] : null;
    $serviceId = !empty($b['service_id']) ? (int)$b['service_id'] : null;
    $date      = trim($b['appointment_date'] ?? '');
    $start     = trim($b['start_time'] ?? '');
    $end       = !empty($b['end_time']) ? trim($b['end_time']) : null;
    $status    = whitelist($b['status'] ?? 'pending', ['pending', 'approved', 'completed', 'cancelled'], 'pending');
    $notes     = $b['notes'] ?? null;

    if (!$patientId || $date === '' || $start === '') {
        sendResponse(false, 'Patient, date and time are required');
    }
    if (slotTaken($conn, $dentistId, $date, $start)) {
        sendResponse(false, 'That dentist already has an appointment at this date and time', null, 409);
    }

    $code      = nextAppointmentCode($conn);
    $createdBy = $user['id'];

    $stmt = $conn->prepare(
        'INSERT INTO appointments
           (appointment_code, patient_id, dentist_id, service_id, appointment_date,
            start_time, end_time, status, notes, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->bind_param(
        'siiisssssi',
        $code, $patientId, $dentistId, $serviceId, $date,
        $start, $end, $status, $notes, $createdBy
    );
    $stmt->execute();
    $id = $stmt->insert_id;
    $stmt->close();

    pushNotification($conn, null, 'appointment', 'New appointment booked', "$code scheduled for $date $start", '/appointments');

    sendResponse(true, 'Appointment booked', ['id' => $id, 'appointment_code' => $code], 201);
}

function updateAppointment(int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid appointment');
    $b = getJsonBody();

    $patientId = (int)($b['patient_id'] ?? 0);
    $dentistId = !empty($b['dentist_id']) ? (int)$b['dentist_id'] : null;
    $serviceId = !empty($b['service_id']) ? (int)$b['service_id'] : null;
    $date      = trim($b['appointment_date'] ?? '');
    $start     = trim($b['start_time'] ?? '');
    $end       = !empty($b['end_time']) ? trim($b['end_time']) : null;
    $status    = whitelist($b['status'] ?? 'pending', ['pending', 'approved', 'completed', 'cancelled'], 'pending');
    $notes     = $b['notes'] ?? null;

    if (!$patientId || $date === '' || $start === '') {
        sendResponse(false, 'Patient, date and time are required');
    }
    if (slotTaken($conn, $dentistId, $date, $start, $id)) {
        sendResponse(false, 'That dentist already has an appointment at this date and time', null, 409);
    }

    // Param types: patient_id(i) dentist_id(i) service_id(i) date(s)
    //              start(s) end(s) status(s) notes(s) id(i)
    $stmt = $conn->prepare(
        'UPDATE appointments SET
           patient_id=?, dentist_id=?, service_id=?, appointment_date=?,
           start_time=?, end_time=?, status=?, notes=?
         WHERE id=?'
    );
    $stmt->bind_param(
        'iiisssssi',
        $patientId, $dentistId, $serviceId, $date,
        $start, $end, $status, $notes, $id
    );
    $stmt->execute();
    $stmt->close();

    sendResponse(true, 'Appointment updated');
}

function changeStatus(array $user, int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid appointment');
    $b      = getJsonBody();
    $status = whitelist($b['status'] ?? '', ['pending', 'approved', 'completed', 'cancelled']);
    if (!$status) sendResponse(false, 'Invalid status');

    $stmt = $conn->prepare('UPDATE appointments SET status = ? WHERE id = ?');
    $stmt->bind_param('si', $status, $id);
    $stmt->execute();
    $stmt->close();

    pushNotification($conn, null, 'appointment', 'Appointment ' . $status, "Appointment #$id marked $status", '/appointments');
    sendResponse(true, "Appointment marked $status");
}

function deleteAppointment(array $user, int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid appointment');
    $stmt = $conn->prepare('DELETE FROM appointments WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Appointment deleted');
}
