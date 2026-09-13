<?php
/* NeoJob API — messages.php (mirrors the `Messages` helper)
 * GET  ?action=getByApplication&candidatureId=5
 * POST ?              body: {applicationId, senderRole, body} -> create
 */
require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function shape_message($row){
    return [
        'id' => (int)$row['id'],
        'applicationId' => (int)$row['candidature_id'],
        'senderRole' => $row['expediteur_role'],
        'body' => $row['contenu'],
        'dateEnvoi' => $row['date_envoi'],
    ];
}

if ($method === 'GET' && $action === 'getByApplication') {
    $stmt = $pdo->prepare('SELECT * FROM messages WHERE candidature_id = ? ORDER BY date_envoi');
    $stmt->execute([$_GET['candidatureId'] ?? 0]);
    respond(array_map('shape_message', $stmt->fetchAll()));
}

if ($method === 'POST') {
    require_role(['candidat', 'recruteur']);
    $in = json_body();
    $now = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare('INSERT INTO messages (candidature_id, expediteur_role, contenu, date_envoi) VALUES (?, ?, ?, ?)');
    $stmt->execute([$in['applicationId'], $in['senderRole'], $in['body'], $now]);
    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM messages WHERE id = ?');
    $stmt->execute([$id]);
    respond(shape_message($stmt->fetch()), 201);
}

respond_error('Méthode non supportée.', 405);
