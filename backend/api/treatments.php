<?php
/**
 * Treatments endpoint — clinical dental records (procedure, diagnosis,
 * prescription, tooth, cost) attached to a patient.
 *   GET    /api/treatments.php?patient_id=5        -> list for a patient
 *   GET    /api/treatments.php?id=9                -> single treatment
 *   GET    /api/treatments.php?recent=1&limit=10   -> recent across all patients
 *   POST   /api/treatments.php                     -> create
 *   PUT    /api/treatments.php?id=9                -> update
 *   DELETE /api/treatments.php?id=9                -> delete
 */

require_once __DIR__ . '/../bootstrap.php';
$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
global $conn;

switch ($method) {
    case 'GET':
        if (!empty($_GET['id']))         getTreatment((int)$_GET['id']);
        elseif (!empty($_GET['recent'])) recentTreatments();
        else                             listTreatments((int)($_GET['patient_id'] ?? 0));
        break;
    case 'POST':   createTreatment(); break;
    case 'PUT':    updateTreatment((int)($_GET['id'] ?? 0)); break;
    case 'DELETE': deleteTreatment((int)($_GET['id'] ?? 0)); break;
    default:       sendResponse(false, 'Method not allowed', null, 405);
}

function baseSelect(): string
{
    return "SELECT t.*, d.name AS dentist_name,
                   TRIM(CONCAT(p.first_name,' ',p.last_name)) AS patient_name,
                   p.patient_code, a.appointment_code
            FROM treatments t
            LEFT JOIN dentists d ON d.id = t.dentist_id
            LEFT JOIN patients p ON p.id = t.patient_id
            LEFT JOIN appointments a ON a.id = t.appointment_id";
}

function listTreatments(int $patientId): void
{
    global $conn;
    if (!$patientId) sendResponse(false, 'A patient is required');
    $stmt = $conn->prepare(baseSelect() . ' WHERE t.patient_id = ? ORDER BY t.treatment_date DESC, t.id DESC');
    $stmt->bind_param('i', $patientId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    $stmt->close();
    sendResponse(true, '', $rows);
}

function recentTreatments(): void
{
    global $conn;
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 10)));
    $res = $conn->query(baseSelect() . " ORDER BY t.treatment_date DESC, t.id DESC LIMIT $limit");
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    sendResponse(true, '', $rows);
}

function getTreatment(int $id): void
{
    global $conn;
    $stmt = $conn->prepare(baseSelect() . ' WHERE t.id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) sendResponse(false, 'Treatment not found', null, 404);
    sendResponse(true, '', $row);
}

function readTreatmentBody(): array
{
    $b = getJsonBody();
    $patientId = (int)($b['patient_id'] ?? 0);
    if (!$patientId) sendResponse(false, 'A patient is required');
    $name = trim($b['treatment_name'] ?? '');
    if ($name === '') sendResponse(false, 'Treatment / procedure name is required');

    return [
        'patient_id' => $patientId,
        'appt_id'    => !empty($b['appointment_id']) ? (int)$b['appointment_id'] : null,
        'dentist_id' => !empty($b['dentist_id']) ? (int)$b['dentist_id'] : null,
        'name'       => $name,
        'tooth'      => $b['tooth_number'] ?? null,
        'diagnosis'  => $b['diagnosis'] ?? null,
        'procedure'  => $b['procedure_notes'] ?? null,
        'rx'         => $b['prescription'] ?? null,
        'cost'       => (float)($b['cost'] ?? 0),
        'date'       => !empty($b['treatment_date']) ? $b['treatment_date'] : date('Y-m-d'),
    ];
}

function createTreatment(): void
{
    global $conn;
    $d = readTreatmentBody();
    $stmt = $conn->prepare(
        'INSERT INTO treatments
           (patient_id, appointment_id, dentist_id, treatment_name, tooth_number,
            diagnosis, procedure_notes, prescription, cost, treatment_date)
         VALUES (?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->bind_param(
        'iiisssssds',
        $d['patient_id'], $d['appt_id'], $d['dentist_id'], $d['name'], $d['tooth'],
        $d['diagnosis'], $d['procedure'], $d['rx'], $d['cost'], $d['date']
    );
    $stmt->execute();
    $id = $stmt->insert_id;
    $stmt->close();
    sendResponse(true, 'Treatment record added', ['id' => $id], 201);
}

function updateTreatment(int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid treatment');
    $d = readTreatmentBody();
    $stmt = $conn->prepare(
        'UPDATE treatments SET
           patient_id=?, appointment_id=?, dentist_id=?, treatment_name=?, tooth_number=?,
           diagnosis=?, procedure_notes=?, prescription=?, cost=?, treatment_date=?
         WHERE id=?'
    );
    $stmt->bind_param(
        'iiisssssdsi',
        $d['patient_id'], $d['appt_id'], $d['dentist_id'], $d['name'], $d['tooth'],
        $d['diagnosis'], $d['procedure'], $d['rx'], $d['cost'], $d['date'], $id
    );
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Treatment record updated');
}

function deleteTreatment(int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid treatment');
    $stmt = $conn->prepare('DELETE FROM treatments WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    sendResponse(true, 'Treatment record deleted');
}
