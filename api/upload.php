<?php
/* NeoJob API — upload.php
 * POST multipart/form-data: file=<the file>, kind=photo|cv
 * Saves under /uploads/{candidats|entreprises}/{userId}/ and returns {path: "uploads/..."}.
 * Replaces the old NeoUI.readFileAsDataUrl() base64-in-JSON approach. */

require 'config.php';
require 'helpers.php';
require 'session.php';

$user = require_role(['candidat', 'recruteur']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['file'])) {
    respond_error('Fichier manquant.', 400);
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    respond_error('Échec du téléversement.', 400);
}

$kind = $_POST['kind'] ?? 'photo';
$maxSize = $kind === 'cv' ? 5 * 1024 * 1024 : 3 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    respond_error('Fichier trop volumineux.', 413);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowed = $kind === 'cv'
    ? ['application/pdf' => 'pdf']
    : ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];

if (!isset($allowed[$mime])) {
    respond_error('Type de fichier non autorisé.', 415);
}

$subdir = $user['role'] === 'candidat' ? 'candidats' : 'entreprises';
$dir = __DIR__ . "/../uploads/$subdir/{$user['userId']}";
if (!is_dir($dir)) mkdir($dir, 0755, true);

$filename = bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
move_uploaded_file($file['tmp_name'], "$dir/$filename");

respond([
    'path' => "uploads/$subdir/{$user['userId']}/$filename",
    'name' => $file['name'],
]);
