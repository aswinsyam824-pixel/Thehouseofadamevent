<?php
/*
 * Enquiry form handler (PHP 7.4+).
 * ------------------------------------------------------------------
 * EDIT THESE TWO LINES BEFORE GOING LIVE:
 *   MAIL_TO   = the business inbox that receives enquiries
 *   MAIL_FROM = an address on THIS website's domain (e.g. website@yourdomain.com),
 *               created in your hosting email panel, so enquiries are not marked as spam.
 * ------------------------------------------------------------------
 */
const MAIL_TO   = 'enquiries@example.com';
const MAIL_FROM = 'website@example.com';
const RATE_MAX = 5;            // enquiries allowed per visitor...
const RATE_WINDOW = 15 * 60;   // ...in this many seconds

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function reply($status, $data) { http_response_code($status); echo json_encode($data); exit; }
$generic = 'Your enquiry could not be sent. Please try again or contact us by email.';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405, ['ok' => false]);

$raw = file_get_contents('php://input', false, null, 0, 32768);
$in = json_decode($raw, true);
if (!is_array($in)) $in = $_POST;

// Honeypot: hidden field people never fill.
if (!empty($in['website'])) reply(200, ['ok' => true, 'reference' => null]);

// Simple rate limit per IP (stored in the system temp folder).
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rf = sys_get_temp_dir() . '/hae_rate_' . md5($ip);
$hits = array_filter((array) json_decode(@file_get_contents($rf) ?: '[]', true), fn($t) => $t > time() - RATE_WINDOW);
if (count($hits) >= RATE_MAX) reply(429, ['ok' => false, 'message' => 'Too many enquiries have been sent from this connection. Please wait a few minutes, then try again or contact us by email.']);

$f = fn($k) => trim(str_replace(["\r\n", "\r"], "\n", (string) ($in[$k] ?? '')));
$d = [];
foreach (['name','email','phone','organisation','service','date','location','guests','budget','details'] as $k) $d[$k] = $f($k);
$d['name'] = preg_replace('/\s+/', ' ', $d['name']);

$services = ['Catering', 'Advertising', 'Exhibitions and Fairs', 'Conferences', 'Not Sure Yet'];
$limits = ['name' => 100, 'email' => 254, 'phone' => 40, 'organisation' => 150, 'location' => 250, 'details' => 5000, 'budget' => 100];
$e = [];
if ($d['name'] === '') $e['name'] = 'Enter your name.';
if ($d['email'] === '') $e['email'] = 'Enter your email address.';
elseif (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) $e['email'] = 'Enter an email address in the format name@example.com.';
if ($d['service'] === '' || !in_array($d['service'], $services, true)) $e['service'] = 'Choose the service you are interested in.';
if ($d['details'] === '') $e['details'] = 'Tell us about your event.';
if ($d['phone'] !== '' && !preg_match('/^\+?[\d\s().\-\/]{6,40}$/', $d['phone'])) $e['phone'] = 'Enter a telephone number using digits, spaces and an optional + country code.';
if ($d['guests'] !== '' && !preg_match('/^[1-9]\d*$/', $d['guests'])) $e['guests'] = 'Enter the guest count as a whole number, such as 120.';
if ($d['date'] !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $d['date'])) $e['date'] = 'Enter a valid date, or leave this blank.';
foreach ($limits as $k => $max) if (!isset($e[$k]) && mb_strlen($d[$k]) > $max) $e[$k] = "This field must be $max characters or fewer.";
if ($e) reply(422, ['ok' => false, 'errors' => $e, 'message' => 'Check the highlighted fields.']);

$ref = 'HAE-' . gmdate('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
$rows = [
  'Reference' => $ref, 'Submitted' => gmdate('D, d M Y H:i:s') . ' GMT',
  'Name' => $d['name'], 'Email' => $d['email'], 'Telephone' => $d['phone'], 'Organisation' => $d['organisation'],
  'Service of interest' => $d['service'], 'Preferred date' => $d['date'] ?: 'Not specified',
  'Venue or location' => $d['location'], 'Estimated guest count' => $d['guests'], 'Budget range' => $d['budget'] ?: 'Not specified',
];
$body = '';
foreach ($rows as $k => $v) if ($v !== '') $body .= "$k: $v\n";
$body .= "\nEvent details:\n" . $d['details'] . "\n";

$clean = fn($s) => preg_replace('/[\r\n]+/', ' ', $s);
$subject = $clean("Website enquiry $ref: {$d['service']} from {$d['name']}");
$headers = implode("\r\n", [
  'From: The House of Adam Events website <' . MAIL_FROM . '>',
  'Reply-To: ' . $clean($d['name']) . ' <' . $clean($d['email']) . '>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'X-Enquiry-Reference: ' . $ref,
]);

$sent = mail(MAIL_TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers, '-f' . MAIL_FROM);
if (!$sent) { error_log("[enquiry] $ref mail() failed"); reply(502, ['ok' => false, 'message' => $generic]); }

$hits[] = time(); @file_put_contents($rf, json_encode(array_values($hits)));
error_log("[enquiry] $ref accepted");
reply(200, ['ok' => true, 'reference' => $ref]);
