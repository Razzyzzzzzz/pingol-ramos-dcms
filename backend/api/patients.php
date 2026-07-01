<?php
/**
 * Patients endpoint.
 *   GET    /api/patients.php?search=&page=&limit=   -> paginated list
 *   GET    /api/patients.php?id=5                    -> one patient + timeline
 *   POST   /api/patients.php                         -> create
 *   PUT    /api/patients.php?id=5                     -> update
 *   DELETE /api/patients.php?id=5                     -> delete (cascades)
 */

require_once __DIR__ . '/../bootstrap.php';
$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
global $conn;

switch ($method) {
    case 'GET':    isset($_GET['id']) ? getOne((int)$_GET['id']) : listPatients(); break;
    case 'POST':   createPatient($user); break;
    case 'PUT':    updatePatient((int)($_GET['id'] ?? 0)); break;
    case 'DELETE': deletePatient($user, (int)($_GET['id'] ?? 0)); break;
    default:       sendResponse(false, 'Method not allowed', null, 405);
}

function listPatients(): void
{
    global $conn;
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = min(100, max(1, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;
    $search = sanitize($conn, $_GET['search'] ?? '');

    $where = '';
    if ($search !== '') {
        $like  = "%$search%";
        $where = "WHERE CONCAT(first_name,' ',last_name) LIKE '$like'
                     OR patient_code LIKE '$like'
                     OR contact_number LIKE '$like'
                     OR email LIKE '$like'";
    }

    $total = (int)($conn->query("SELECT COUNT(*) FROM patients $where")->fetch_row()[0]);

    $rows = [];
    $res = $conn->query(
        "SELECT id, patient_code, first_name, last_name, birthdate, gender,
                contact_number, email, created_at,
                TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) AS age
         FROM patients $where
         ORDER BY created_at DESC
         LIMIT $limit OFFSET $offset"
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

function getOne(int $id): void
{
    global $conn;
    $stmt = $conn->prepare(
        'SELECT *, TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) AS age FROM patients WHERE id = ? LIMIT 1'
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $patient = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$patient) sendResponse(false, 'Patient not found', null, 404);

    // Timeline pieces
    $appointments = [];
    $stmt = $conn->prepare(
        'SELECT a.id, a.appointment_code, a.appointment_date, a.start_time, a.status,
                d.name dentist, s.name service
         FROM appointments a
         LEFT JOIN dentists d ON d.id = a.dentist_id
         LEFT JOIN services s ON s.id = a.service_id
         WHERE a.patient_id = ? ORDER BY a.appointment_date DESC'
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $r = $stmt->get_result();
    while ($row = $r->fetch_assoc()) $appointments[] = $row;
    $stmt->close();

    $treatments = [];
    $stmt = $conn->prepare(
        'SELECT t.*, d.name dentist FROM treatments t
         LEFT JOIN dentists d ON d.id = t.dentist_id
         WHERE t.patient_id = ? ORDER BY t.treatment_date DESC'
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $r = $stmt->get_result();
    while ($row = $r->fetch_assoc()) $treatments[] = $row;
    $stmt->close();

    $files = [];
    $stmt = $conn->prepare('SELECT * FROM dental_records WHERE patient_id = ? ORDER BY created_at DESC');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $r = $stmt->get_result();
    while ($row = $r->fetch_assoc()) $files[] = $row;
    $stmt->close();

    $payments = [];
    $stmt = $conn->prepare('SELECT * FROM payments WHERE patient_id = ? ORDER BY payment_date DESC');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $r = $stmt->get_result();
    while ($row = $r->fetch_assoc()) $payments[] = $row;
    $stmt->close();

    sendResponse(true, '', [
        'patient'      => $patient,
        'appointments' => $appointments,
        'treatments'   => $treatments,
        'files'        => $files,
        'payments'     => $payments,
    ]);
}

function nextPatientCode(mysqli $conn): string
{
    $n = (int)($conn->query('SELECT COALESCE(MAX(id),0)+1 FROM patients')->fetch_row()[0]);
    return 'PT-' . str_pad((string)$n, 4, '0', STR_PAD_LEFT);
}

function createPatient(array $user): void
{
    global $conn;
    $b = getJsonBody();

    $first = trim($b['first_name'] ?? '');
    $last  = trim($b['last_name'] ?? '');
    if ($first === '' || $last === '') sendResponse(false, 'First and last name are required');

    $gender = whitelist($b['gender'] ?? null, ['male', 'female', 'other']);
    $code   = nextPatientCode($conn);

    $birthdate = $b['birthdate'] ?? null;
    $address   = $b['address'] ?? null;
    $contact   = $b['contact_number'] ?? null;
    $email     = $b['email'] ?? null;
    $medical   = $b['medical_history'] ?? null;
    $allergies = $b['allergies'] ?? null;
    $existing  = $b['existing_conditions'] ?? null;
    $ecName    = $b['emergency_contact_name'] ?? null;
    $ecNumber  = $b['emergency_contact_number'] ?? null;
    $createdBy = $user['id'];

    $stmt = $conn->prepare(
        'INSERT INTO patients
           (patient_code, first_name, last_name, birthdate, gender, address, contact_number,
            email, medical_history, allergies, existing_conditions,
            emergency_contact_name, emergency_contact_number, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->bind_param(
        'sssssssssssssi',
        $code, $first, $last, $birthdate, $gender, $address, $contact,
        $email, $medical, $allergies, $existing, $ecName, $ecNumber, $createdBy
    );
    $stmt->execute();
    $id = $stmt->insert_id;
    $stmt->close();

    sendResponse(true, 'Patient added', ['id' => $id, 'patient_code' => $code], 201);
}

function updatePatient(int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid patient');
    $b = getJsonBody();

    $first = trim($b['first_name'] ?? '');
    $last  = trim($b['last_name'] ?? '');
    if ($first === '' || $last === '') sendResponse(false, 'First and last name are required');

    $gender    = whitelist($b['gender'] ?? null, ['male', 'female', 'other']);
    $birthdate = $b['birthdate'] ?? null;
    $address   = $b['address'] ?? null;
    $contact   = $b['contact_number'] ?? null;
    $email     = $b['email'] ?? null;
    $medical   = $b['medical_history'] ?? null;
    $allergies = $b['allergies'] ?? null;
    $existing  = $b['existing_conditions'] ?? null;
    $ecName    = $b['emergency_contact_name'] ?? null;
    $ecNumber  = $b['emergency_contact_number'] ?? null;

    $stmt = $conn->prepare(
        'UPDATE patients SET
           first_name=?, last_name=?, birthdate=?, gender=?, address=?, contact_number=?,
           email=?, medical_history=?, allergies=?, existing_conditions=?,
           emergency_contact_name=?, emergency_contact_number=?
         WHERE id=?'
    );
    $stmt->bind_param(
        'ssssssssssssi',
        $first, $last, $birthdate, $gender, $address, $contact,
        $email, $medical, $allergies, $existing, $ecName, $ecNumber, $id
    );
    $stmt->execute();
    $stmt->close();

    sendResponse(true, 'Patient updated');
}

function deletePatient(array $user, int $id): void
{
    global $conn;
    if (!in_array($user['role'], ['admin'], true)) {
        sendResponse(false, 'Only administrators can delete patients', null, 403);
    }
    if (!$id) sendResponse(false, 'Invalid patient');
    $stmt = $conn->prepare('DELETE FROM patients WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Patient deleted');
}
