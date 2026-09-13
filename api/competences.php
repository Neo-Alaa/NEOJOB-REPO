<?php
/* NeoJob API — competences.php (mirrors the `Competences` helper)
 * GET ?action=findOrCreateByName&nom=React -> returns the canonical name (creates it if missing)
 */
require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function shape_competence($row){ return ['id' => (int)$row['id'], 'nom' => $row['nom']]; }

if ($method === 'GET') {
    if ($action === 'findOrCreateByName') {
        $nom = trim($_GET['nom'] ?? '');
        if ($nom === '') respond(['nom' => '']);
        $stmt = $pdo->prepare('SELECT * FROM competences WHERE nom = ?');
        $stmt->execute([$nom]);
        $row = $stmt->fetch();
        if (!$row) {
            $pdo->prepare('INSERT INTO competences (nom) VALUES (?)')->execute([$nom]);
            $stmt = $pdo->prepare('SELECT * FROM competences WHERE id = ?');
            $stmt->execute([$pdo->lastInsertId()]);
            $row = $stmt->fetch();
        }
        respond(shape_competence($row));
    }
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM competences WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        respond($row ? shape_competence($row) : null);
    }
    $rows = $pdo->query('SELECT * FROM competences ORDER BY nom')->fetchAll();
    respond(array_map('shape_competence', $rows));
}

if ($method === 'POST') {
    require_role('admin');
    $in = json_body();
    $pdo->prepare('INSERT INTO competences (nom) VALUES (?)')->execute([$in['nom'] ?? '']);
    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM competences WHERE id = ?');
    $stmt->execute([$id]);
    respond(shape_competence($stmt->fetch()), 201);
}

if ($method === 'PUT') {
    require_role('admin');
    $in = json_body();
    $id = $_GET['id'] ?? ($in['id'] ?? null);
    if (!$id) respond_error('id manquant.', 400);
    if (array_key_exists('nom', $in)) {
        $pdo->prepare('UPDATE competences SET nom = ? WHERE id = ?')->execute([$in['nom'], $id]);
    }
    $stmt = $pdo->prepare('SELECT * FROM competences WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    respond($row ? shape_competence($row) : null);
}

if ($method === 'DELETE') {
    require_role('admin');
    $id = $_GET['id'] ?? null;
    if (!$id) respond_error('id manquant.', 400);
    $pdo->prepare('DELETE FROM competences WHERE id = ?')->execute([$id]);
    respond(['ok' => true]);
}

respond_error('Méthode non supportée.', 405);
