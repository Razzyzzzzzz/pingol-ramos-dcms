<?php
/**
 * Minimal, dependency-free JWT (HS256).
 * Enough for stateless auth between the React SPA and this API.
 */

require_once __DIR__ . '/config.php';

function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string
{
    $pad = strlen($data) % 4;
    if ($pad) {
        $data .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Create a signed token. $claims should include at least 'sub' (user id).
 */
function jwt_encode(array $claims): string
{
    $header  = ['typ' => 'JWT', 'alg' => 'HS256'];
    $now     = time();
    $payload = array_merge([
        'iss' => JWT_ISSUER,
        'iat' => $now,
        'exp' => $now + JWT_TTL,
    ], $claims);

    $segments = [
        base64url_encode(json_encode($header)),
        base64url_encode(json_encode($payload)),
    ];
    $signing   = implode('.', $segments);
    $signature = hash_hmac('sha256', $signing, JWT_SECRET, true);
    $segments[] = base64url_encode($signature);

    return implode('.', $segments);
}

/**
 * Verify + decode a token. Returns the claims array on success, or null.
 */
function jwt_decode(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$h, $p, $s] = $parts;

    $expected = base64url_encode(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
    if (!hash_equals($expected, $s)) {
        return null; // bad signature
    }

    $payload = json_decode(base64url_decode($p), true);
    if (!is_array($payload)) {
        return null;
    }
    if (isset($payload['exp']) && time() >= (int)$payload['exp']) {
        return null; // expired
    }
    return $payload;
}
