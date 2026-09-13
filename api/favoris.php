<?php
/* NeoJob API — favoris.php (mirrors the `Favorites` helper)
 * GET  ?action=getByCandidate&candidatId=1
 * GET  ?action=isFavorite&candidatId=1&offreId=4  -> bool
 * POST ?action=toggle           body: {candidateId, jobId} -> bool (now favorite?)
 */
require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function shape_favori($row){ return ['id' => (int)$row['id'], 'candidateId' => (int)$row['candidat_id'], 'jobId' => (int)$row['offre_id']]; }

if ($method === 'GET') {
    if ($action === 'getByCandidate') {
        $stmt = $pdo->prepare('SELECT * FROM favoris WHERE candidat_id = ?');
        $stmt->execute([$_GET['candidatId'] ?? 0]);
        respond(array_map('shape_favori', $stmt->fetchAll()));
    }
    if ($action === 'isFavorite') {
        $stmt = $pdo->prepare('SELECT 1 FROM favoris WHERE candidat_id = ? AND offre_id = ?');
        $stmt->execute([$_GET['candidatId'] ?? 0, $_GET['offreId'] ?? 0]);
        respond((bool)$stmt->fetch());
    }
    respond_error('Action inconnue.', 404);
}

if ($method === 'POST' && $action === 'toggle') {
    require_role('candidat');
    $in = json_body();
    $find = $pdo->prepare('SELECT id FROM favoris WHERE candidat_id = ? AND offre_id = ?');
    $find->execute([$in['candidateId'], $in['jobId']]);
    $existing = $find->fetchColumn();
    if ($existing) {
        $pdo->prepare('DELETE FROM favoris WHERE id = ?')->execute([$existing]);
        respond(false);
    }
    $pdo->prepare('INSERT INTO favoris (candidat_id, offre_id) VALUES (?, ?)')->execute([$in['candidateId'], $in['jobId']]);
    respond(true);
}

respond_error('Méthode non supportée.', 405);
