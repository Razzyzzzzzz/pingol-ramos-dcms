<?php
/**
 * AI Chatbot assistant — rule-based (no external API needed).
 * Matches the user's message against intent keywords and answers using a mix of
 * canned guidance and a few live values (clinic info, services) from the DB.
 *
 *   POST /api/chatbot.php   { message }   -> { reply, suggestions }
 *   GET  /api/chatbot.php?history=1       -> recent conversation for this user
 *
 * Conversations are stored in chatbot_logs.
 */

require_once __DIR__ . '/../bootstrap.php';
$user   = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
global $conn;

if ($method === 'GET' && !empty($_GET['history'])) { history((int)$user['id']); }
if ($method !== 'POST') sendResponse(false, 'Method not allowed', null, 405);

$body    = getJsonBody();
$message = trim($body['message'] ?? '');
if ($message === '') sendResponse(false, 'Please type a message');

[$reply, $suggestions] = answer(strtolower($message));

// Log the exchange (best-effort).
$stmt = $conn->prepare('INSERT INTO chatbot_logs (user_id, message, response) VALUES (?, ?, ?)');
$uid = (int)$user['id'];
$stmt->bind_param('iss', $uid, $message, $reply);
$stmt->execute();
$stmt->close();

sendResponse(true, '', ['reply' => $reply, 'suggestions' => $suggestions]);

// -----------------------------------------------------------------------------

function setting(string $key, string $fallback = ''): string
{
    global $conn;
    $stmt = $conn->prepare('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1');
    $stmt->bind_param('s', $key);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return ($row && $row['setting_value'] !== null && $row['setting_value'] !== '') ? $row['setting_value'] : $fallback;
}

function hasAny(string $text, array $words): bool
{
    foreach ($words as $w) {
        if (strpos($text, $w) !== false) return true;
    }
    return false;
}

/**
 * Return [replyText, suggestionChips].
 */
function answer(string $t): array
{
    $defaultChips = ['How do I book an appointment?', 'What are your clinic hours?', 'What services do you offer?'];

    // Greetings
    if (hasAny($t, ['hello', 'hi ', 'hey', 'good morning', 'good afternoon', 'kumusta', 'kamusta']) || $t === 'hi') {
        return ['Hello! I\'m the Pingol Ramos assistant. I can help you book appointments, find patient records, check inventory, or navigate the system. What do you need?', $defaultChips];
    }

    // Booking an appointment
    if (hasAny($t, ['book', 'appointment', 'schedule', 'reschedule', 'set an appointment'])) {
        if (hasAny($t, ['cancel'])) {
            return ['To cancel an appointment: open Appointments, find the entry, and use the status menu to set it to Cancelled. Cancelled slots free up the dentist\'s time immediately.', ['How do I reschedule?', 'View today\'s appointments']];
        }
        if (hasAny($t, ['reschedule', 'move', 'change the date', 'change date'])) {
            return ['To reschedule: go to Appointments, click the appointment, then Edit and choose a new date/time. The system blocks double-booking, so you\'ll be warned if the new slot is taken.', ['How do I book an appointment?', 'Appointment statuses']];
        }
        return ['To book an appointment: go to Appointments and click "New Appointment". Pick the patient, dentist, service, date, and an open time slot, then save. The system automatically prevents double-booking the same dentist.', ['What services do you offer?', 'What are your clinic hours?']];
    }

    // Appointment statuses
    if (hasAny($t, ['status', 'pending', 'approved', 'completed', 'cancelled'])) {
        return ['Appointments move through four statuses: Pending (just booked), Approved (confirmed by staff), Completed (patient was seen), and Cancelled. You can change status from the Appointments list.', ['How do I book an appointment?']];
    }

    // Clinic hours
    if (hasAny($t, ['hour', 'open', 'close', 'schedule of clinic', 'what time'])) {
        $hours = setting('operating_hours', 'Mon–Sat, 9:00 AM – 6:00 PM');
        return ["Our clinic hours are: $hours. You can update these anytime under Settings → Clinic Information.", ['How do I book an appointment?', 'Where is the clinic?']];
    }

    // Location / contact
    if (hasAny($t, ['where', 'location', 'address', 'contact', 'phone', 'email', 'reach'])) {
        $addr  = setting('clinic_address', 'See Settings → Clinic Information');
        $phone = setting('clinic_phone', '');
        $email = setting('clinic_email', '');
        $extra = trim(($phone ? " Phone: $phone." : '') . ($email ? " Email: $email." : ''));
        return ["Clinic address: $addr.$extra", $defaultChips];
    }

    // Services / pricing
    if (hasAny($t, ['service', 'treatment', 'price', 'cost', 'how much', 'offer', 'procedure'])) {
        return [servicesReply(), ['How do I book an appointment?', 'What are your clinic hours?']];
    }

    // Patients
    if (hasAny($t, ['patient', 'record', 'medical history', 'add patient', 'find patient'])) {
        return ['To manage patients: open the Patients module. You can add a new patient, search by name or code, and open any patient to see their history timeline, treatments, and uploaded files (x-rays, lab results, prescriptions).', ['How do I upload an x-ray?', 'How do I add a treatment?']];
    }

    // File uploads / dental records
    if (hasAny($t, ['upload', 'x-ray', 'xray', 'file', 'document', 'lab result', 'attachment'])) {
        return ['To upload a file: open a patient, go to their Records/Files section, and use Upload. Accepted types are PDF, JPG, PNG, WEBP, DOC, and DOCX, up to 10 MB. You can preview images and PDFs before downloading.', ['How do I find a patient?']];
    }

    // Inventory
    if (hasAny($t, ['inventory', 'stock', 'supply', 'supplies', 'item', 'reorder', 'expired'])) {
        return ['The Inventory module tracks supplies with quantity, unit, prices, supplier, and expiry. It flags Low Stock, Out of Stock, and Expiring items automatically, and raises a notification when something drops to its reorder level.', ['Show low-stock alerts', 'How do I add an item?']];
    }

    // Revenue / payments
    if (hasAny($t, ['revenue', 'payment', 'income', 'earnings', 'sales', 'paid'])) {
        return ['Revenue is driven by recorded payments. The Revenue module shows daily, weekly, monthly, and annual totals, a revenue-vs-expenses trend, and payment history. Net Income = Revenue − Expenses for the current month.', ['How do I record a payment?', 'How do I add an expense?']];
    }

    // Expenses
    if (hasAny($t, ['expense', 'spending', 'bills', 'utilities', 'rent', 'salary'])) {
        return ['Use the Expenses module to log clinic costs by category (equipment, supplies, utilities, rent, salaries, maintenance, other). Monthly totals feed the dashboard\'s Net Income calculation.', ['How do I see revenue?']];
    }

    // Reports
    if (hasAny($t, ['report', 'export', 'excel', 'pdf', 'print'])) {
        return ['The Reports module lets you generate and export summaries for appointments, patients, revenue, expenses, and inventory. Most list screens also have Print for a clean, print-friendly layout.', $defaultChips];
    }

    // Login / password
    if (hasAny($t, ['password', 'login', 'log in', 'sign in', 'forgot', 'locked out'])) {
        return ['If you forgot your password, use "Forgot Password" on the login page. To change it while signed in, go to Settings → Change Password. Admins can also reset any user\'s password under User Management.', ['How do I add a user?']];
    }

    // Users / roles
    if (hasAny($t, ['user', 'staff', 'admin', 'role', 'permission', 'account'])) {
        return ['Admins manage accounts under Settings → User Management: add admins, dentists, or staff, edit details, toggle active status, or reset passwords. Roles control what each person can access.', $defaultChips];
    }

    // Thanks
    if (hasAny($t, ['thank', 'salamat', 'thanks'])) {
        return ['You\'re welcome! Anything else I can help you with?', $defaultChips];
    }

    // Fallback
    return ['I\'m not sure about that one yet, but I can help with booking appointments, patients, dental records, inventory, revenue, expenses, reports, and account settings. Try one of these:', $defaultChips];
}

function servicesReply(): string
{
    global $conn;
    $names = [];
    $res = $conn->query("SELECT name, price FROM services WHERE status='active' ORDER BY name ASC LIMIT 8");
    while ($row = $res->fetch_assoc()) {
        $names[] = $row['name'] . ' (₱' . number_format((float)$row['price'], 0) . ')';
    }
    if (!$names) {
        return 'We offer a range of dental services. Add them under the Services list so they appear when booking.';
    }
    return 'Some of our services: ' . implode(', ', $names) . '. You can see the full list when booking an appointment.';
}

function history(int $uid): void
{
    global $conn;
    $stmt = $conn->prepare('SELECT message, response, created_at FROM chatbot_logs WHERE user_id = ? ORDER BY id DESC LIMIT 20');
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) $rows[] = $row;
    $stmt->close();
    sendResponse(true, '', array_reverse($rows));
}
