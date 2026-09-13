<?php
/* NeoJob API — candidats.php (mirrors the `Candidates` helper)
 * GET  ?                          -> all candidates
 * GET  ?id=1                      -> one candidate
 * GET  ?action=getByUserId&utilisateurId=4
 * POST ?                          body: candidate fields -> create
 * PUT  ?                          body: {id, ...changes, skills?}
 * PUT  ?action=verifySkill&id=1   body: {skill: "React"}
 */

require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function candidat_skills($pdo, $candidatId){
    $stmt = $pdo->prepare('SELECT c.nom, cc.verifiee FROM candidat_competences cc JOIN competences c ON c.id = cc.competence_id WHERE cc.candidat_id = ?');
    $stmt->execute([$candidatId]);
    $rows = $stmt->fetchAll();
    return [
        'skills' => array_map(fn($r) => $r['nom'], $rows),
        'verifiedSkills' => array_values(array_map(fn($r) => $r['nom'], array_filter($rows, fn($r) => (bool)$r['verifiee']))),
    ];
}

function shape_candidat($row, $pdo){
    $skills = candidat_skills($pdo, $row['id']);
    return [
        'id' => (int)$row['id'],
        'userId' => (int)$row['utilisateur_id'],
        'prenom' => $row['prenom'],
        'nom' => $row['nom'],
        'ville' => $row['ville'],
        'telephone' => $row['telephone'],
        'bio' => $row['bio'],
        'skills' => $skills['skills'],
        'verifiedSkills' => $skills['verifiedSkills'],
        'cvName' => $row['cv_nom'],
        'cvPath' => $row['cv_path'],
        'photo' => $row['photo_path'],
        'videoUrl' => $row['video_url'],
    ];
}

function set_candidat_skills($pdo, $candidatId, $noms){
    $existing = $pdo->prepare('SELECT c.id, c.nom, cc.verifiee FROM candidat_competences cc JOIN competences c ON c.id = cc.competence_id WHERE cc.candidat_id = ?');
    $existing->execute([$candidatId]);
    $keepVerified = [];
    foreach ($existing->fetchAll() as $r) { if ($r['verifiee']) $keepVerified[$r['nom']] = true; }

    $pdo->prepare('DELETE FROM candidat_competences WHERE candidat_id = ?')->execute([$candidatId]);
    if (!$noms) return;
    $find = $pdo->prepare('SELECT id FROM competences WHERE nom = ?');
    $insertComp = $pdo->prepare('INSERT INTO competences (nom) VALUES (?)');
    $link = $pdo->prepare('INSERT INTO candidat_competences (candidat_id, competence_id, verifiee) VALUES (?, ?, ?)');
    foreach ($noms as $nom) {
        $nom = trim($nom);
        if ($nom === '') continue;
        $find->execute([$nom]);
        $compId = $find->fetchColumn();
        if (!$compId) { $insertComp->execute([$nom]); $compId = $pdo->lastInsertId(); }
        $link->execute([$candidatId, $compId, !empty($keepVerified[$nom]) ? 1 : 0]);
    }
}

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM candidats WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        respond($row ? shape_candidat($row, $pdo) : null);
    }
    if ($action === 'getByUserId') {
        $stmt = $pdo->prepare('SELECT * FROM candidats WHERE utilisateur_id = ?');
        $stmt->execute([$_GET['utilisateurId'] ?? 0]);
        $row = $stmt->fetch();
        respond($row ? shape_candidat($row, $pdo) : null);
    }
    $rows = $pdo->query('SELECT * FROM candidats')->fetchAll();
    respond(array_map(fn($r) => shape_candidat($r, $pdo), $rows));
}

if ($method === 'POST') {
    $in = json_body();
    $stmt = $pdo->prepare('INSERT INTO candidats (utilisateur_id, prenom, nom, ville, telephone, bio) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$in['userId'], $in['prenom'] ?? '', $in['nom'] ?? '', $in['ville'] ?? '', $in['telephone'] ?? '', $in['bio'] ?? '']);
    $id = (int)$pdo->lastInsertId();
    if (!empty($in['skills'])) set_candidat_skills($pdo, $id, $in['skills']);
    $stmt = $pdo->prepare('SELECT * FROM candidats WHERE id = ?');
    $stmt->execute([$id]);
    respond(shape_candidat($stmt->fetch(), $pdo), 201);
}

if ($method === 'PUT') {
    $in = json_body();
    $id = $_GET['id'] ?? ($in['id'] ?? null);
    if (!$id) respond_error('id manquant.', 400);

    if ($action === 'verifySkill') {
        $nom = trim($in['skill'] ?? '');
        if ($nom === '') respond_error('skill manquant.', 400);
        $find = $pdo->prepare('SELECT id FROM competences WHERE nom = ?');
        $find->execute([$nom]);
        $compId = $find->fetchColumn();
        if (!$compId) {
            $pdo->prepare('INSERT INTO competences (nom) VALUES (?)')->execute([$nom]);
            $compId = $pdo->lastInsertId();
        }
        $exists = $pdo->prepare('SELECT 1 FROM candidat_competences WHERE candidat_id = ? AND competence_id = ?');
        $exists->execute([$id, $compId]);
        if ($exists->fetch()) {
            $pdo->prepare('UPDATE candidat_competences SET verifiee = 1 WHERE candidat_id = ? AND competence_id = ?')->execute([$id, $compId]);
        } else {
            $pdo->prepare('INSERT INTO candidat_competences (candidat_id, competence_id, verifiee) VALUES (?, ?, 1)')->execute([$id, $compId]);
        }
    } else {
        $map = ['prenom'=>'prenom','nom'=>'nom','ville'=>'ville','telephone'=>'telephone','bio'=>'bio','cvName'=>'cv_nom','cvPath'=>'cv_path','photo'=>'photo_path','videoUrl'=>'video_url'];
        $sets = []; $params = [];
        foreach ($map as $jsKey => $col) {
            if (array_key_exists($jsKey, $in)) { $sets[] = "$col = ?"; $params[] = $in[$jsKey]; }
        }
        if ($sets) {
            $params[] = $id;
            $pdo->prepare('UPDATE candidats SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
        }
        if (array_key_exists('skills', $in)) set_candidat_skills($pdo, $id, $in['skills']);
    }

    $stmt = $pdo->prepare('SELECT * FROM candidats WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    respond($row ? shape_candidat($row, $pdo) : null);
}

respond_error('Méthode non supportée.', 405);
