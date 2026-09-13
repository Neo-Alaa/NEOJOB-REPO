<?php
/* NeoJob API — entreprises.php (mirrors the `Companies` helper in assets/js/db.js)
 *
 * GET  ?                                  -> all companies
 * GET  ?id=1                              -> one company
 * GET  ?action=getByUserId&utilisateurId=2
 * GET  ?action=activeJobCount&id=1        -> published+pending job count (int)
 * POST ?                                  body: company fields             -> create
 * PUT  ?                                  body: {id, ...changes}           -> update
 * PUT  ?action=upgradeToPremium&id=1
 * PUT  ?action=setVerified&id=1           body: {verified: bool}
 */

require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function entreprise_photos($pdo, $entrepriseId){
    $stmt = $pdo->prepare('SELECT photo_path FROM entreprise_photos WHERE entreprise_id = ? ORDER BY position');
    $stmt->execute([$entrepriseId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function shape_entreprise($row, $pdo){
    return [
        'id' => (int)$row['id'],
        'userId' => (int)$row['utilisateur_id'],
        'nom' => $row['nom'],
        'secteur' => $row['secteur'],
        'ville' => $row['ville'],
        'siteWeb' => $row['site_web'],
        'description' => $row['description'],
        'logo' => $row['logo_path'],
        'plan' => $row['plan'],
        'verified' => (bool)$row['verifiee'],
        'videoUrl' => $row['video_url'],
        'photos' => entreprise_photos($pdo, $row['id']),
    ];
}

if ($method === 'GET') {
    if (isset($_GET['id']) && $action !== 'activeJobCount') {
        $stmt = $pdo->prepare('SELECT * FROM entreprises WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        respond($row ? shape_entreprise($row, $pdo) : null);
    }
    if ($action === 'getByUserId') {
        $stmt = $pdo->prepare('SELECT * FROM entreprises WHERE utilisateur_id = ?');
        $stmt->execute([$_GET['utilisateurId'] ?? 0]);
        $row = $stmt->fetch();
        respond($row ? shape_entreprise($row, $pdo) : null);
    }
    if ($action === 'activeJobCount') {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM offres WHERE entreprise_id = ? AND statut != 'rejetee'");
        $stmt->execute([$_GET['id'] ?? 0]);
        respond((int)$stmt->fetchColumn());
    }
    $rows = $pdo->query('SELECT * FROM entreprises')->fetchAll();
    respond(array_map(fn($r) => shape_entreprise($r, $pdo), $rows));
}

if ($method === 'POST') {
    require_role('recruteur');
    $in = json_body();
    $stmt = $pdo->prepare('INSERT INTO entreprises (utilisateur_id, nom, secteur, ville, site_web, description, plan) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $in['userId'], $in['nom'] ?? '', $in['secteur'] ?? '', $in['ville'] ?? '',
        $in['siteWeb'] ?? '', $in['description'] ?? '', 'free',
    ]);
    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM entreprises WHERE id = ?');
    $stmt->execute([$id]);
    respond(shape_entreprise($stmt->fetch(), $pdo), 201);
}

if ($method === 'PUT') {
    $in = json_body();
    $id = $_GET['id'] ?? ($in['id'] ?? null);
    if (!$id) respond_error('id manquant.', 400);

    if ($action === 'upgradeToPremium') {
        $pdo->prepare("UPDATE entreprises SET plan = 'premium' WHERE id = ?")->execute([$id]);
    } elseif ($action === 'setVerified') {
        $pdo->prepare('UPDATE entreprises SET verifiee = ? WHERE id = ?')->execute([!empty($in['verified']) ? 1 : 0, $id]);
    } else {
        $map = [
            'nom' => 'nom', 'secteur' => 'secteur', 'ville' => 'ville', 'siteWeb' => 'site_web',
            'description' => 'description', 'logo' => 'logo_path', 'plan' => 'plan', 'videoUrl' => 'video_url',
        ];
        $sets = []; $params = [];
        foreach ($map as $jsKey => $col) {
            if (array_key_exists($jsKey, $in)) {
                $sets[] = "$col = ?";
                $params[] = $in[$jsKey];
            }
        }
        if ($sets) {
            $params[] = $id;
            $pdo->prepare('UPDATE entreprises SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
        }
        // `photos` mirrors the mock's semantics: caller sends the full new
        // array (after their own add/remove), we replace the gallery to match.
        if (array_key_exists('photos', $in)) {
            $pdo->prepare('DELETE FROM entreprise_photos WHERE entreprise_id = ?')->execute([$id]);
            $insert = $pdo->prepare('INSERT INTO entreprise_photos (entreprise_id, photo_path, position) VALUES (?, ?, ?)');
            foreach (array_values($in['photos']) as $i => $path) {
                $insert->execute([$id, $path, $i]);
            }
        }
    }

    $stmt = $pdo->prepare('SELECT * FROM entreprises WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    respond($row ? shape_entreprise($row, $pdo) : null);
}

respond_error('Méthode non supportée.', 405);
