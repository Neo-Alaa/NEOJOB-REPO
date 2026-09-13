<?php
/* NeoJob API — candidatures.php (mirrors the `Applications` helper)
 * GET  ?                              -> all applications
 * GET  ?id=1
 * GET  ?action=getByCandidate&candidatId=1
 * GET  ?action=getByJob&offreId=1
 * GET  ?action=hasApplied&candidatId=1&offreId=1  -> bool
 * POST ?                              body: {jobId, candidateId, lettreMotivation, cvName?} -> create
 * PUT  ?action=updateStatus&id=1      body: {statut}
 * DELETE ?id=1
 */

require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function shape_candidature($row){
    return [
        'id' => (int)$row['id'],
        'jobId' => (int)$row['offre_id'],
        'candidateId' => (int)$row['candidat_id'],
        'lettreMotivation' => $row['lettre_motivation'],
        'cvName' => $row['cv_nom'],
        'cvPath' => $row['cv_path'],
        'statut' => $row['statut'],
        'dateCandidature' => $row['date_candidature'],
        'updatedAt' => $row['date_maj'],
    ];
}

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM candidatures WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        respond($row ? shape_candidature($row) : null);
    }
    if ($action === 'getByCandidate') {
        $stmt = $pdo->prepare('SELECT * FROM candidatures WHERE candidat_id = ?');
        $stmt->execute([$_GET['candidatId'] ?? 0]);
        respond(array_map('shape_candidature', $stmt->fetchAll()));
    }
    if ($action === 'getByJob') {
        $stmt = $pdo->prepare('SELECT * FROM candidatures WHERE offre_id = ?');
        $stmt->execute([$_GET['offreId'] ?? 0]);
        respond(array_map('shape_candidature', $stmt->fetchAll()));
    }
    if ($action === 'hasApplied') {
        $stmt = $pdo->prepare('SELECT 1 FROM candidatures WHERE candidat_id = ? AND offre_id = ?');
        $stmt->execute([$_GET['candidatId'] ?? 0, $_GET['offreId'] ?? 0]);
        respond((bool)$stmt->fetch());
    }
    $rows = $pdo->query('SELECT * FROM candidatures')->fetchAll();
    respond(array_map('shape_candidature', $rows));
}

if ($method === 'POST') {
    require_role('candidat');
    $in = json_body();
    $stmt = $pdo->prepare('INSERT INTO candidatures (offre_id, candidat_id, lettre_motivation, cv_nom, statut, date_candidature, date_maj) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $now = date('Y-m-d');
    $stmt->execute([$in['jobId'], $in['candidateId'], $in['lettreMotivation'] ?? '', $in['cvName'] ?? null, 'en_attente', $now, $now]);
    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM candidatures WHERE id = ?');
    $stmt->execute([$id]);
    respond(shape_candidature($stmt->fetch()), 201);
}

if ($method === 'PUT') {
    $in = json_body();
    $id = $_GET['id'] ?? ($in['id'] ?? null);
    if (!$id) respond_error('id manquant.', 400);

    if ($action === 'updateStatus') {
        $pdo->prepare('UPDATE candidatures SET statut = ?, date_maj = ? WHERE id = ?')->execute([$in['statut'], date('Y-m-d'), $id]);
    }

    $stmt = $pdo->prepare('SELECT * FROM candidatures WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    respond($row ? shape_candidature($row) : null);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) respond_error('id manquant.', 400);
    // ON DELETE CASCADE on entretiens/messages(candidature_id) handles the
    // cleanup that Applications.remove() used to do by hand in the mock.
    $pdo->prepare('DELETE FROM candidatures WHERE id = ?')->execute([$id]);
    respond(['ok' => true]);
}

respond_error('Méthode non supportée.', 405);
