<?php
/* NeoJob API — paiements.php (mirrors the `Payments` helper)
 * GET  ?                              -> all payments
 * GET  ?action=getByCompany&entrepriseId=1
 * POST ?                              body: {companyId, montant} -> create (simulated payment)
 */
require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function shape_paiement($row){
    return ['id' => (int)$row['id'], 'companyId' => (int)$row['entreprise_id'], 'montant' => (float)$row['montant'], 'date' => $row['date_paiement'], 'statut' => $row['statut']];
}

if ($method === 'GET') {
    if ($action === 'getByCompany') {
        $stmt = $pdo->prepare('SELECT * FROM paiements WHERE entreprise_id = ? ORDER BY date_paiement DESC');
        $stmt->execute([$_GET['entrepriseId'] ?? 0]);
        respond(array_map('shape_paiement', $stmt->fetchAll()));
    }
    $rows = $pdo->query('SELECT * FROM paiements')->fetchAll();
    respond(array_map('shape_paiement', $rows));
}

if ($method === 'POST') {
    require_role('recruteur');
    $in = json_body();
    $now = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare('INSERT INTO paiements (entreprise_id, montant, date_paiement, statut) VALUES (?, ?, ?, ?)');
    $stmt->execute([$in['companyId'], $in['montant'], $now, 'reussi']);
    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM paiements WHERE id = ?');
    $stmt->execute([$id]);
    respond(shape_paiement($stmt->fetch()), 201);
}

respond_error('Méthode non supportée.', 405);
