<?php
/* NeoJob API — alertes.php (mirrors the `JobAlerts` helper)
 * GET  ?action=getByCandidate&candidatId=1
 * POST ?              body: {candidateId, label, q, ville, categoryId, competence, contrat, remote} -> create
 * DELETE ?id=1
 */
require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function shape_alerte($row){
    return [
        'id' => (int)$row['id'],
        'candidateId' => (int)$row['candidat_id'],
        'label' => $row['label'],
        'q' => $row['mot_cle'],
        'ville' => $row['ville'],
        'categoryId' => $row['categorie_id'] !== null ? (int)$row['categorie_id'] : null,
        'competence' => $row['competence_id'] ? null : '', // resolved below when needed
        'contrat' => $row['type_contrat'],
        'remote' => (bool)$row['remote'],
        'createdAt' => $row['date_creation'],
    ];
}

if ($method === 'GET') {
    if ($action === 'getByCandidate') {
        $stmt = $pdo->prepare('SELECT a.*, c.nom AS competence_nom FROM alertes a LEFT JOIN competences c ON c.id = a.competence_id WHERE a.candidat_id = ?');
        $stmt->execute([$_GET['candidatId'] ?? 0]);
        $rows = $stmt->fetchAll();
        respond(array_map(function($r){
            $shaped = shape_alerte($r);
            $shaped['competence'] = $r['competence_nom'] ?? '';
            return $shaped;
        }, $rows));
    }
    $rows = $pdo->query('SELECT * FROM alertes')->fetchAll();
    respond(array_map('shape_alerte', $rows));
}

if ($method === 'POST') {
    require_role('candidat');
    $in = json_body();
    $competenceId = null;
    if (!empty($in['competence'])) {
        $find = $pdo->prepare('SELECT id FROM competences WHERE nom = ?');
        $find->execute([$in['competence']]);
        $competenceId = $find->fetchColumn() ?: null;
    }
    $stmt = $pdo->prepare('INSERT INTO alertes (candidat_id, label, mot_cle, ville, categorie_id, competence_id, type_contrat, remote, date_creation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $in['candidateId'], $in['label'], $in['q'] ?? '', $in['ville'] ?? '',
        $in['categoryId'] ?? null, $competenceId, $in['contrat'] ?? '', !empty($in['remote']) ? 1 : 0, date('Y-m-d'),
    ]);
    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM alertes WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    $shaped = shape_alerte($row);
    $shaped['competence'] = $in['competence'] ?? '';
    respond($shaped, 201);
}

if ($method === 'DELETE') {
    require_role('candidat');
    $id = $_GET['id'] ?? null;
    if (!$id) respond_error('id manquant.', 400);
    $pdo->prepare('DELETE FROM alertes WHERE id = ?')->execute([$id]);
    respond(['ok' => true]);
}

respond_error('Méthode non supportée.', 405);
