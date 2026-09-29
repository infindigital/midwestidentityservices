<?php
/**
 * Midwest Identity Services: quote form handler
 * ---------------------------------------------------------------------------
 * Receives the Request a Quote form (request-a-quote/) and emails it through
 * Gmail SMTP with PHPMailer.
 *
 *   Sender    a Gmail account you control (SMTP_USER / SMTP_PASS in config.php)
 *   Recipient the client's inbox (MAIL_TO in config.php), no password needed
 *   Reply-To  the visitor, so the client can press Reply to answer them
 *
 * Responds with JSON:
 *   200 {"ok":true}
 *   405 wrong method   403 foreign origin   422 invalid fields
 *   429 too many requests   500 not configured   502 SMTP send failed
 *
 * Error details (including SMTP errors) go to the server's PHP error log only,
 * never to the visitor.
 * ---------------------------------------------------------------------------
 */

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

function log_error(string $message): void
{
    error_log('[quote form] ' . $message);
}

/* ---- Configuration ------------------------------------------------------ */
$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    log_error('mail/config.php is missing. Copy config.sample.php to config.php and fill it in.');
    respond(500, ['ok' => false, 'error' => 'not_configured']);
}
$config = require $configFile;

foreach (['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'MAIL_TO'] as $key) {
    if (empty($config[$key])) {
        log_error("config.php: {$key} is empty.");
        respond(500, ['ok' => false, 'error' => 'not_configured']);
    }
}
if (strcasecmp((string) $config['SMTP_FROM'], (string) $config['SMTP_USER']) !== 0) {
    // Gmail rewrites or flags mail whose From does not match the signed-in account.
    log_error('config.php: SMTP_FROM should match SMTP_USER, otherwise mail may be marked as spam.');
}

/* ---- Origin and method -------------------------------------------------- */
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowOrigin = rtrim((string) ($config['ALLOW_ORIGIN'] ?? ''), '/');
if ($origin !== '') {
    $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
    $originPort = parse_url($origin, PHP_URL_PORT);
    $originHostPort = $originHost . ($originPort ? ':' . $originPort : '');
    $serverHost = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $sameOrigin = $originHostPort === $serverHost || $originHost === $serverHost;

    if ($allowOrigin !== '' && strcasecmp($origin, $allowOrigin) === 0) {
        header('Access-Control-Allow-Origin: ' . $allowOrigin);
        header('Vary: Origin');
    } elseif (!$sameOrigin) {
        respond(403, ['ok' => false, 'error' => 'forbidden_origin']);
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Accept, Content-Type');
    http_response_code(204);
    exit;
}
if ($method !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

/* ---- Spam trap: bots fill the hidden field; pretend it worked ----------- */
if (trim((string) ($_POST['company_website'] ?? '')) !== '') {
    respond(200, ['ok' => true]);
}

/* ---- Rate limit: 5 requests per 15 minutes per visitor IP --------------- */
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$rateFile = rtrim(sys_get_temp_dir(), '/\\') . DIRECTORY_SEPARATOR . 'mis-quote-' . hash('sha256', $ip) . '.json';
$window = 15 * 60;
$limit = 5;
$now = time();
$hits = [];
if (is_file($rateFile)) {
    $stored = json_decode((string) @file_get_contents($rateFile), true);
    if (is_array($stored)) {
        $hits = array_values(array_filter($stored, static function ($t) use ($now, $window) {
            return is_int($t) && $t > $now - $window;
        }));
    }
}
if (count($hits) >= $limit) {
    header('Retry-After: ' . max(60, ($hits[0] + $window) - $now));
    respond(429, ['ok' => false, 'error' => 'rate_limited']);
}

/* ---- Read and validate -------------------------------------------------- */
function cut(string $value, int $max): string
{
    return function_exists('mb_substr') ? mb_substr($value, 0, $max, 'UTF-8') : substr($value, 0, $max);
}

/** One-line field: no line breaks, so nothing can be injected into headers. */
function field(string $key, int $max): string
{
    $value = (string) ($_POST[$key] ?? '');
    $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '';
    return trim(cut($value, $max));
}

/** Multi-line field: keeps line breaks, drops other control characters. */
function textarea(string $key, int $max): string
{
    $value = str_replace(["\r\n", "\r"], "\n", (string) ($_POST[$key] ?? ''));
    $value = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]+/u', '', $value) ?? '';
    return trim(cut($value, $max));
}

$data = [
    'name'     => field('name', 120),
    'company'  => field('company', 160),
    'email'    => field('email', 254),
    'phone'    => field('phone', 40),
    'service'  => field('service', 80),
    'people'   => field('people', 40),
    'location' => field('location', 160),
    'message'  => textarea('message', 5000),
];

// Must match the <option> values of #service in contact-us/index.html.
$services = [
    'Help me identify my fingerprint requirement',
    'Multi-state licensing fingerprinting',
    'Individual fingerprinting',
    'Live Scan fingerprinting',
    'FD-258 fingerprinting',
    'ATF / EFT fingerprinting',
    'Florida FDLE Live Scan',
    'FINRA fingerprinting',
    'FBI Identity History Summary or apostille',
    'Corporate, mobile or group program',
    'Drug testing',
    'DOT drug and alcohol program',
    'Something else',
];
$headcounts = ['Just me', '1 to 9', '10 to 24', '25 to 49', '50 to 99', '100 or more', 'Not sure yet'];

$errors = [];
foreach (['name', 'email', 'service'] as $required) {
    if ($data[$required] === '') {
        $errors[$required] = 'required';
    }
}
if ($data['email'] !== '' && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'invalid';
}
if ($data['phone'] !== '' && strlen((string) preg_replace('/\D+/', '', $data['phone'])) < 10) {
    $errors['phone'] = 'invalid';
}
if ($data['service'] !== '' && !in_array($data['service'], $services, true)) {
    $errors['service'] = 'invalid';
}
if ($data['people'] !== '' && !in_array($data['people'], $headcounts, true)) {
    $errors['people'] = 'invalid';
}
if ($errors) {
    respond(422, ['ok' => false, 'error' => 'invalid', 'fields' => $errors]);
}

// Count this attempt against the rate limit now that it is a real request.
$hits[] = $now;
@file_put_contents($rateFile, json_encode($hits), LOCK_EX);

/* ---- Build the email ---------------------------------------------------- */
$esc = static function (string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
};

try {
    $submitted = (new DateTimeImmutable('now', new DateTimeZone('America/Chicago')))->format('F j, Y \a\t g:i A T');
} catch (Exception $e) {
    $submitted = gmdate('Y-m-d H:i') . ' UTC';
}
$page = field('page', 300);
if ($page === '') {
    $page = cut((string) preg_replace('/[\x00-\x1F\x7F]+/', '', (string) ($_SERVER['HTTP_REFERER'] ?? '')), 300);
}

$rows = [
    'Name'              => $data['name'],
    'Organization'      => $data['company'],
    'Email'             => $data['email'],
    'Phone'             => $data['phone'] !== '' ? $data['phone'] : 'Not given',
    'Service'           => $data['service'],
    'People to print'   => $data['people'],
    'Location'          => $data['location'],
];

$html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#121826;max-width:620px">'
    . '<h2 style="margin:0 0 4px;font-size:20px;color:#0D1321">New quote request</h2>'
    . '<p style="margin:0 0 18px;color:#4A5262">Sent from the Request a Quote form on ' . $esc($submitted) . '.</p>'
    . '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">';
foreach ($rows as $label => $value) {
    $cell = $esc($value);
    if ($label === 'Email') {
        $cell = '<a href="mailto:' . $esc($value) . '" style="color:#17654D">' . $esc($value) . '</a>';
    } elseif ($label === 'Phone' && $data['phone'] !== '') {
        $cell = '<a href="tel:' . $esc((string) preg_replace('/[^\d+]/', '', $value)) . '" style="color:#17654D">' . $esc($value) . '</a>';
    }
    $html .= '<tr>'
        . '<td style="padding:9px 14px 9px 0;border-bottom:1px solid #E4E7EC;color:#676E7C;white-space:nowrap;vertical-align:top">' . $esc($label) . '</td>'
        . '<td style="padding:9px 0;border-bottom:1px solid #E4E7EC;font-weight:600">' . $cell . '</td>'
        . '</tr>';
}
$html .= '</table>'
    . '<h3 style="margin:22px 0 6px;font-size:15px;color:#0D1321">Message</h3>'
    . '<p style="margin:0;white-space:pre-wrap">' . ($data['message'] !== '' ? nl2br($esc($data['message'])) : '<span style="color:#676E7C">No message added.</span>') . '</p>'
    . '<p style="margin:26px 0 0;font-size:13px;color:#676E7C">Press Reply to answer ' . $esc($data['name']) . ' directly.'
    . ($page !== '' ? '<br>Page: ' . $esc($page) : '') . '</p>'
    . '</div>';

$text = "New quote request\nSent from the Request a Quote form on {$submitted}.\n\n";
foreach ($rows as $label => $value) {
    $text .= str_pad($label . ':', 18) . $value . "\n";
}
$text .= "\nMessage:\n" . ($data['message'] !== '' ? $data['message'] : 'No message added.') . "\n\n"
    . 'Reply to this email to answer ' . $data['name'] . " directly.\n"
    . ($page !== '' ? "Page: {$page}\n" : '');

$subject = ($data['service'] === 'Help me identify my fingerprint requirement' ? 'Requirement review: ' : 'New quote request: ')
    . $data['service'] . ' (' . ($data['company'] !== '' ? $data['company'] : $data['name']) . ')';

/* ---- Send through Gmail SMTP -------------------------------------------- */
require __DIR__ . '/vendor/PHPMailer/Exception.php';
require __DIR__ . '/vendor/PHPMailer/PHPMailer.php';
require __DIR__ . '/vendor/PHPMailer/SMTP.php';

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = (string) $config['SMTP_HOST'];
    $mail->Port = (int) $config['SMTP_PORT'];
    $mail->SMTPAuth = true;
    $mail->Username = (string) $config['SMTP_USER'];
    $mail->Password = str_replace(' ', '', (string) $config['SMTP_PASS']);
    $mail->Timeout = 20;

    $secure = strtolower((string) ($config['SMTP_SECURE'] ?? 'tls'));
    if ($secure === 'ssl') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } elseif ($secure === 'tls') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        $mail->SMTPSecure = '';
        $mail->SMTPAutoTLS = false;
    }

    if (!empty($config['SMTP_DEBUG'])) {
        $mail->SMTPDebug = SMTP::DEBUG_SERVER;
        $mail->Debugoutput = static function ($line) {
            log_error('smtp: ' . trim((string) $line));
        };
    }

    $mail->CharSet = PHPMailer::CHARSET_UTF8;
    $mail->setFrom((string) $config['SMTP_FROM'], (string) ($config['SMTP_FROM_NAME'] ?? 'Website'));
    $mail->addAddress((string) $config['MAIL_TO'], (string) ($config['MAIL_TO_NAME'] ?? ''));
    $mail->addReplyTo($data['email'], $data['name']);

    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $html;
    $mail->AltBody = $text;

    $mail->send();
} catch (MailException $e) {
    log_error('send failed: ' . $mail->ErrorInfo);
    respond(502, ['ok' => false, 'error' => 'send_failed']);
}

respond(200, ['ok' => true]);
