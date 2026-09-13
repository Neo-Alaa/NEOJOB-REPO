<?php
/* NeoJob API — offres.php (mirrors the `Jobs` helper in assets/js/db.js 1:1)
 *
 * GET  ?                              -> all jobs
 * GET  ?id=5                          -> one job
 * GET  ?action=getPublished           -> published jobs
 * GET  ?action=getPending             -> jobs awaiting moderation
 * GET  ?action=getByCompany&entrepriseId=1
 * POST ?                              body: job fields (+ competences[])  -> create
 * POST ?action=recordView&id=5        -> vues + 1
 * PUT  ?action=approve&id=5           -> statut = publiee
 * PUT  ?action=reject&id=5            -> statut = rejetee
 * PUT  ?                              body: {id, ...changes, competences?} -> update
 * DELETE ?id=5
 */

require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function offre_competences($pdo, $offreId){
    $stmt = $pdo->prepare('SELECT c.nom FROM offre_competences oc JOIN competences c ON c.id = oc.competence_id WHERE oc.offre_id = ?');
    $stmt->execute([$offreId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function shape_offre($row, $pdo){
    return [
        'id' => (int)$row['id'],
        'companyId' => (int)$row['entreprise_id'],
        'titre' => $row['titre'],
        'categoryId' => $row['categorie_id'] !== null ? (int)$row['categorie_id'] : null,
        'typeContrat' => $row['type_contrat'],
        'ville' => $row['ville'],
        'remote' => (bool)$row['remote'],
        'salaireMin' => (int)$row['salaire_min'],
        'salaireMax' => (int)$row['salaire_max'],
        'description' => $row['description'],
        'competences' => offre_competences($pdo, $row['id']),
        'statut' => $row['statut'],
        'datePublication' => $row['date_publication'],
        'vues' => (int)$row['vues'],
    ];
}

function shape_offres($rows, $pdo){
    return array_map(fn($r) => shape_offre($r, $pdo), $rows);
}

function set_offre_competences($pdo, $offreId, $noms){
    $pdo->prepare('DELETE FROM offre_competences WHERE offre_id = ?')->execute([$offreId]);
    if (!$noms) return;
    $findOrCreate = $pdo->prepare('SELECT id FROM competences WHERE nom = ?');
    $insertComp = $pdo->prepare('INSERT INTO competences (nom) VALUES (?)');
    $link = $pdo->prepare('INSERT INTO offre_competences (offre_id, competence_id) VALUES (?, ?)');
    foreach ($noms as $nom) {
        $nom = trim($nom);
        if ($nom === '') continue;
        $findOrCreate->execute([$nom]);
        $compId = $findOrCreate->fetchColumn();
        if (!$compId) {
            $insertComp->execute([$nom]);
            $compId = $pdo->lastInsertId();
        }
        $link->execute([$offreId, $compId]);
    }
}

// ---------- GET ----------
if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM offres WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        respond($row ? shape_offre($row, $pdo) : null);
    }
    if ($action === 'getPublished') {
        $rows = $pdo->query("SELECT * FROM offres WHERE statut = 'publiee'")->fetchAll();
        respond(shape_offres($rows, $pdo));
    }
    if ($action === 'getPending') {
        $rows = $pdo->query("SELECT * FROM offres WHERE statut = 'en_attente'")->fetchAll();
        respond(shape_offres($rows, $pdo));
    }
    if ($action === 'getByCompany') {
        $stmt = $pdo->prepare('SELECT * FROM offres WHERE entreprise_id = ?');
        $stmt->execute([$_GET['entrepriseId'] ?? 0]);
        respond(shape_offres($stmt->fetchAll(), $pdo));
    }
    $rows = $pdo->query('SELECT * FROM offres')->fetchAll();
    respond(shape_offres($rows, $pdo));
}

// ---------- POST ----------
if ($method === 'POST') {
    if ($action === 'recordView') {
        $stmt = $pdo->prepare('UPDATE offres SET vues = vues + 1 WHERE id = ?');
        $stmt->execute([$_GET['id'] ?? 0]);
        respond(['ok' => true]);
    }

    require_role('recruteur');
    $in = json_body();
    $stmt = $pdo->prepare('INSERT INTO offres (entreprise_id, titre, categorie_id, type_contrat, ville, remote, salaire_min, salaire_max, description, statut, date_publication)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $in['companyId'], $in['titre'], $in['categoryId'] ?? null, $in['typeContrat'],
        $in['ville'], !empty($in['remote']) ? 1 : 0, $in['salaireMin'] ?? 0, $in['salaireMax'] ?? 0,
        $in['description'] ?? '', 'en_attente', date('Y-m-d'),
    ]);
    $id = (int)$pdo->lastInsertId();
    set_offre_competences($pdo, $id, $in['competences'] ?? []);

    $stmt = $pdo->prepare('SELECT * FROM offres WHERE id = ?');
    $stmt->execute([$id]);
    respond(shape_offre($stmt->fetch(), $pdo), 201);
}

// ---------- PUT ----------
if ($method === 'PUT') {
    $in = json_body();
    $id = $_GET['id'] ?? ($in['id'] ?? null);
    if (!$id) respond_error('id manquant.', 400);

    if ($action === 'approve') {
        $pdo->prepare("UPDATE offres SET statut = 'publiee' WHERE id = ?")->execute([$id]);
    } elseif ($action === 'reject') {
        $pdo->prepare("UPDATE offres SET statut = 'rejetee' WHERE id = ?")->execute([$id]);
    } else {
        $map = [
            'titre' => 'titre', 'categoryId' => 'categorie_id', 'typeContrat' => 'type_contrat',
            'ville' => 'ville', 'remote' => 'remote', 'salaireMin' => 'salaire_min',
            'salaireMax' => 'salaire_max', 'description' => 'description', 'statut' => 'statut',
        ];
        $sets = []; $params = [];
        foreach ($map as $jsKey => $col) {
            if (array_key_exists($jsKey, $in)) {
                $sets[] = "$col = ?";
                $params[] = $jsKey === 'remote' ? (!empty($in[$jsKey]) ? 1 : 0) : $in[$jsKey];
            }
        }
        if ($sets) {
            $params[] = $id;
            $pdo->prepare('UPDATE offres SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
        }
        if (array_key_exists('competences', $in)) {
            set_offre_competences($pdo, $id, $in['competences']);
        }
    }

    $stmt = $pdo->prepare('SELECT * FROM offres WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    respond($row ? shape_offre($row, $pdo) : null);
}

// ---------- DELETE ----------
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) respond_error('id manquant.', 400);
    $pdo->prepare('DELETE FROM offres WHERE id = ?')->execute([$id]);
    respond(['ok' => true]);
}

respond_error('Méthode non supportée.', 405);
