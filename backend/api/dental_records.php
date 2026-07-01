<?php
/**
 * Dental records (uploaded files) endpoint — x-rays, lab results, documents,
 * prescriptions. Handles secure multipart uploads and streamed downloads.
 *
 *   GET    /api/dental_records.php?patient_id=5        -> list files for a patient
 *   GET    /api/dental_records.php?download=9          -> stream/preview a file
 *   POST   /api/dental_records.php                     -> upload (multipart/form-data)
 *          fields: patient_id, title, category, notes, file
 *   DELETE /api/dental_records.php?id=9                -> delete record + file
 *
 * Security: MIME sniffed with finfo AND matched to an extension whitelist,
 * files are renamed to an unguessable name, size-capped, and stored in a
 * directory where PHP execution is disabled (see uploads/.htaccess).
 */

require_once __DIR__ . '/../bootstrap.php';
$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
global $conn;

const RECORD_CATEGORIES = ['xray','lab_result','document','prescription','other'];

switch ($method) {
    case 'GET':
        if (isset($_GET['download'])) downloadFile((int)$_GET['download']);
        else                          listFiles((int)($_GET['patient_id'] ?? 0));
        break;
    case 'POST':   uploadFile($user); break;
    case 'DELETE': deleteFile((int)($_GET['id'] ?? 0)); break;
    default:       sendResponse(false, 'Method not allowed', null, 405);
}

function listFiles(int $patientId): void
{
    global $conn;
    if (!$patientId) sendResponse(false, 'A patient is required');
    $stmt = $conn->prepare(
        "SELECT r.id, r.patient_id, r.title, r.category, r.file_name, r.file_type,
                r.file_size, r.notes, r.created_at, u.name AS uploaded_by_name
         FROM dental_records r
         LEFT JOIN users u ON u.id = r.uploaded_by
         WHERE r.patient_id = ? ORDER BY r.created_at DESC, r.id DESC"
    );
    $stmt->bind_param('i', $patientId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        // Expose a download URL the frontend can hit (auth still enforced there).
        $row['download_url'] = 'dental_records.php?download=' . $row['id'];
        $rows[] = $row;
    }
    $stmt->close();
    sendResponse(true, '', $rows);
}

function uploadFile(array $user): void
{
    global $conn;

    $patientId = (int)($_POST['patient_id'] ?? 0);
    if (!$patientId) sendResponse(false, 'A patient is required');

    $title = trim($_POST['title'] ?? '');
    if ($title === '') sendResponse(false, 'A title is required');

    $category = whitelist($_POST['category'] ?? 'document', RECORD_CATEGORIES, 'document');
    $notes    = $_POST['notes'] ?? null;

    if (empty($_FILES['file']) || ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        sendResponse(false, 'A file is required (upload failed or missing)');
    }

    $file = $_FILES['file'];
    if ($file['size'] <= 0)                 sendResponse(false, 'The uploaded file is empty');
    if ($file['size'] > MAX_UPLOAD_BYTES)   sendResponse(false, 'File exceeds the 10 MB limit');
    if (!is_uploaded_file($file['tmp_name'])) sendResponse(false, 'Invalid upload');

    // Sniff the real MIME type — do not trust the browser-supplied type.
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);
    $allowed = $GLOBALS['ALLOWED_UPLOAD_MIME'];
    if (!isset($allowed[$mime])) {
        sendResponse(false, 'Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX');
    }
    $ext = $allowed[$mime];

    // Ensure the destination directory exists and is writable.
    if (!is_dir(UPLOAD_DIR) && !mkdir(UPLOAD_DIR, 0755, true) && !is_dir(UPLOAD_DIR)) {
        error_log('Failed to create upload dir: ' . UPLOAD_DIR);
        sendResponse(false, 'Server could not store the file', null, 500);
    }

    // Unguessable stored name; keep original for display only.
    $storedName   = 'pr_' . bin2hex(random_bytes(16)) . '.' . $ext;
    $destination  = UPLOAD_DIR . $storedName;
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        error_log('move_uploaded_file failed to ' . $destination);
        sendResponse(false, 'Server could not store the file', null, 500);
    }

    $originalName = substr(preg_replace('/[^\w.\- ]/', '_', $file['name']), 0, 200);
    $size = (int)$file['size'];

    $stmt = $conn->prepare(
        'INSERT INTO dental_records
           (patient_id, title, category, file_name, file_path, file_type, file_size, notes, uploaded_by)
         VALUES (?,?,?,?,?,?,?,?,?)'
    );
    $stmt->bind_param(
        'isssssisi',
        $patientId, $title, $category, $originalName, $storedName, $mime, $size, $notes, $user['id']
    );
    $stmt->execute();
    $id = $stmt->insert_id;
    $stmt->close();

    sendResponse(true, 'File uploaded', [
        'id'           => $id,
        'file_name'    => $originalName,
        'file_type'    => $mime,
        'file_size'    => $size,
        'download_url' => 'dental_records.php?download=' . $id,
    ], 201);
}

function downloadFile(int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid file');

    $stmt = $conn->prepare('SELECT file_name, file_path, file_type FROM dental_records WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) sendResponse(false, 'File not found', null, 404);

    // Guard against path traversal — only ever read from UPLOAD_DIR.
    $path = UPLOAD_DIR . basename($row['file_path']);
    if (!is_file($path)) sendResponse(false, 'File is missing on the server', null, 404);

    // Stream inline so the frontend can preview images/PDFs; browser handles the rest.
    header('Content-Type: ' . ($row['file_type'] ?: 'application/octet-stream'));
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: inline; filename="' . $row['file_name'] . '"');
    header('X-Content-Type-Options: nosniff');
    readfile($path);
    exit;
}

function deleteFile(int $id): void
{
    global $conn;
    if (!$id) sendResponse(false, 'Invalid file');

    $stmt = $conn->prepare('SELECT file_path FROM dental_records WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) sendResponse(false, 'File not found', null, 404);

    $path = UPLOAD_DIR . basename($row['file_path']);
    if (is_file($path)) @unlink($path);

    $stmt = $conn->prepare('DELETE FROM dental_records WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();

    sendResponse(true, 'File deleted');
}
