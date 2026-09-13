<?php
/* NeoJob API — avis.php (mirrors the `Reviews` helper)
 * GET  ?                                     -> all reviews
 * GET  ?id=1
 * GET  ?action=getByCompany&entrepriseId=1&onlyPublished=1
 * GET  ?action=getPending
 * GET  ?action=hasReviewed&candidatId=1&entrepriseId=1  -> bool
 * GET  ?action=getAverageRating&entrepriseId=1          -> number|null
 * POST ?                                     body: review fields -> create (en_attente)
 * PUT  ?action=approve&id=1
 * PUT  ?action=reject&id=1
 * DELETE ?id=1
 */
require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function shape_avis($row){
    return [
        'id' => (int)$row['id'],
        'companyId' => (int)$row['entreprise_id'],
        'candidateId' => (int)$row['candidat_id'],
        'posteLibelle' => $row['poste_libelle'],
        'noteGlobale' => (int)$row['note_globale'],
        'noteAmbiance' => (int)$row['note_ambiance'],
        'noteRemuneration' => (int)$row['note_remuneration'],
        'noteEquilibre' => (int)$row['note_equilibre'],
        'titre' => $row['titre'],
        'avantages' => $row['avantages'],
        'inconvenients' => $row['inconvenients'],
        'recommande' => (bool)$row['recommande'],
        'statut' => $row['statut'],
        'dateCreation' => $row['date_creation'],
    ];
}

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM avis WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        respond($row ? shape_avis($row) : null);
    }
    if ($action === 'getByCompany') {
        $sql = 'SELECT * FROM avis WHERE entreprise_id = ?';
        if (to_bool($_GET['onlyPublished'] ?? false)) $sql .= " AND statut = 'publiee'";
        $sql .= ' ORDER BY date_creation DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$_GET['entrepriseId'] ?? 0]);
        respond(array_map('shape_avis', $stmt->fetchAll()));
    }
    if ($action === 'getPending') {
        $rows = $pdo->query("SELECT * FROM avis WHERE statut = 'en_attente'")->fetchAll();
        respond(array_map('shape_avis', $rows));
    }
    if ($action === 'hasReviewed') {
        $stmt = $pdo->prepare('SELECT 1 FROM avis WHERE candidat_id = ? AND entreprise_id = ?');
        $stmt->execute([$_GET['candidatId'] ?? 0, $_GET['entrepriseId'] ?? 0]);
        respond((bool)$stmt->fetch());
    }
    if ($action === 'getAverageRating') {
        $stmt = $pdo->prepare("SELECT AVG(note_globale) FROM avis WHERE entreprise_id = ? AND statut = 'publiee'");
        $stmt->execute([$_GET['entrepriseId'] ?? 0]);
        $avg = $stmt->fetchColumn();
        respond($avg !== null ? round((float)$avg, 1) : null);
    }
    $rows = $pdo->query('SELECT * FROM avis')->fetchAll();
    respond(array_map('shape_avis', $rows));
}

if ($method === 'POST') {
    require_role('candidat');
    $in = json_body();
    $stmt = $pdo->prepare('INSERT INTO avis (entreprise_id, candidat_id, poste_libelle, note_globale, note_ambiance, note_remuneration, note_equilibre, titre, avantages, inconvenients, recommande, statut, date_creation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $in['companyId'], $in['candidateId'], $in['posteLibelle'] ?? '', $in['noteGlobale'], $in['noteAmbiance'],
        $in['noteRemuneration'], $in['noteEquilibre'], $in['titre'], $in['avantages'], $in['inconvenients'],
        !empty($in['recommande']) ? 1 : 0, 'en_attente', date('Y-m-d'),
    ]);
    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM avis WHERE id = ?');
    $stmt->execute([$id]);
    respond(shape_avis($stmt->fetch()), 201);
}

if ($method === 'PUT') {
    require_role('admin');
    $id = $_GET['id'] ?? null;
    if (!$id) respond_error('id manquant.', 400);
    if ($action === 'approve') {
        $pdo->prepare("UPDATE avis SET statut = 'publiee' WHERE id = ?")->execute([$id]);
    } elseif ($action === 'reject') {
        $pdo->prepare("UPDATE avis SET statut = 'rejetee' WHERE id = ?")->execute([$id]);
    }
    $stmt = $pdo->prepare('SELECT * FROM avis WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    respond($row ? shape_avis($row) : null);
}

if ($method === 'DELETE') {
    require_role('admin');
    $id = $_GET['id'] ?? null;
    if (!$id) respond_error('id manquant.', 400);
    $pdo->prepare('DELETE FROM avis WHERE id = ?')->execute([$id]);
    respond(['ok' => true]);
}

respond_error('Méthode non supportée.', 405);
