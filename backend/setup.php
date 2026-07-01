<?php
/**
 * ONE-TIME SETUP — creates the default login accounts with securely hashed
 * passwords (bcrypt via password_hash). Run this ONCE, then DELETE this file.
 *
 * Run from CLI:      php setup.php
 * Or in a browser:   http://localhost/pingol-ramos-dcms/backend/setup.php?run=1
 *
 * Default credentials (change the passwords after first login):
 *   Admin    admin@pingolramos.com    / Admin@123
 *   Dentist  dentist@pingolramos.com  / Dentist@123
 *   Staff    staff@pingolramos.com    / Staff@123
 */

require_once __DIR__ . '/db.php';

$isCli = (php_sapi_name() === 'cli');
if (!$isCli && ($_GET['run'] ?? '') !== '1') {
    header('Content-Type: text/plain');
    echo "Add ?run=1 to the URL to execute setup, then delete this file.\n";
    exit;
}

$defaults = [
    ['Clinic Administrator', 'admin@pingolramos.com',   'Admin@123',   'admin'],
    ['Dr. Maria Pingol',     'dentist@pingolramos.com', 'Dentist@123', 'dentist'],
    ['Front Desk Staff',     'staff@pingolramos.com',   'Staff@123',   'staff'],
];

$results = [];
foreach ($defaults as [$name, $email, $password, $role]) {
    $hash = password_hash($password, PASSWORD_BCRYPT);

    // Idempotent: insert if new, otherwise refresh name/role/hash.
    $stmt = $conn->prepare(
        'INSERT INTO users (name, email, password_hash, role)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), password_hash = VALUES(password_hash)'
    );
    $stmt->bind_param('ssss', $name, $email, $hash, $role);
    $stmt->execute();
    $stmt->close();

    $results[] = "  {$role}: {$email} / {$password}";
}

$line = str_repeat('=', 64);
$out  = "\n{$line}\nPingol Ramos DCMS — default accounts created / updated:\n{$line}\n"
      . implode("\n", $results)
      . "\n{$line}\n"
      . ">>> IMPORTANT: DELETE backend/setup.php now, and change these\n"
      . ">>> passwords after your first login.\n{$line}\n";

if ($isCli) {
    echo $out;
} else {
    header('Content-Type: text/plain');
    echo $out;
}
