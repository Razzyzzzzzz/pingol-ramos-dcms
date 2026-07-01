<?php
/**
 * Central configuration.
 *
 * Values are read from environment variables (set via .htaccess `SetEnv` on
 * Hostinger, or your server config) and fall back to local-dev defaults so the
 * project runs on XAMPP/Laragel out of the box.
 *
 * IMPORTANT: On any live server, override JWT_SECRET with a long random value.
 */

// ---- Error reporting: log, never leak to the client -------------------------
error_reporting(E_ALL);
ini_set('display_errors', '0');   // never show PHP errors in API responses
ini_set('log_errors', '1');

// ---- Database ---------------------------------------------------------------
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'pingol_ramos_dcms');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_PORT', (int)(getenv('DB_PORT') ?: 3306));

// ---- Auth (JWT) -------------------------------------------------------------
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'CHANGE_ME_to_a_long_random_string_in_production');
define('JWT_TTL', (int)(getenv('JWT_TTL') ?: 60 * 60 * 12)); // token lifetime, seconds (12h)
define('JWT_ISSUER', 'pingol-ramos-dcms');

// ---- CORS -------------------------------------------------------------------
// Comma-separated list of allowed frontend origins.
define('CORS_ORIGINS', getenv('CORS_ORIGINS') ?: 'http://localhost:5173,http://127.0.0.1:5173');

// ---- File uploads -----------------------------------------------------------
define('UPLOAD_DIR', __DIR__ . '/uploads/patient_files/');
define('UPLOAD_URL_BASE', (getenv('APP_URL') ?: '') . '/uploads/patient_files/');
define('MAX_UPLOAD_BYTES', 10 * 1024 * 1024); // 10 MB
$GLOBALS['ALLOWED_UPLOAD_MIME'] = [
    'application/pdf'                                                         => 'pdf',
    'image/jpeg'                                                             => 'jpg',
    'image/png'                                                             => 'png',
    'image/webp'                                                            => 'webp',
    'application/msword'                                                     => 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
];

date_default_timezone_set('Asia/Manila');
