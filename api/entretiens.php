<?php
/* NeoJob API — entretiens.php (mirrors the `Interviews` helper)
 * GET  ?action=getByApplication&candidatureId=5
 * GET  ?action=getByCandidate&candidatId=2
 * GET  ?action=getByCompany&entrepriseId=1
 * POST ?                          body: {applicationId, mode, lieuOuLien, slots:[...]}  -> create
 * PUT  ?action=selectSlot&id=1     body: {slot}
 * PUT  ?action=cancel&id=1
 * PUT  ?                          body: {id, mode?, lieuOuLien?, slots?, statut?, selectedSlot?} -> update/reschedule
 */

require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function shape_entretien($row, $pdo){
    $meta = $pdo->prepare('SELECT ca.offre_id, ca.candidat_id, o.entreprise_id FROM candidatures ca JOIN offres o ON o.id = ca.offre_id WHERE ca.id = ?');
    $meta->execute([$row['candidature_id']]);
    $m = $meta->fetch();

    $slotsStmt = $pdo->prepare('SELECT id, date_heure FROM creneaux_entretien WHERE entretien_id = ? ORDER BY date_heure');
    $slotsStmt->execute([$row['id']]);
    $slotRows = $slotsStmt->fetchAll();

    $selectedSlot = null;
    if ($row['creneau_selectionne_id']) {
        foreach ($slotRows as $s) { if ($s['id'] == $row['creneau_selectionne_id']) { $selectedSlot = $s['date_heure']; break; } }
    }

    return [
        'id' => (int)$row['id'],
        'applicationId' => (int)$row['candidature_id'],
        'jobId' => $m ? (int)$m['offre_id'] : null,
        'candidateId' => $m ? (int)$m['candidat_id'] : null,
        'companyId' => $m ? (int)$m['entreprise_id'] : null,
        'mode' => $row['mode'],
        'lieuOuLien' => $row['lieu_ou_lien'],
        'slots' => array_map(fn($s) => $s['date_heure'], $slotRows),
        'selectedSlot' => $selectedSlot,
        'statut' => $row['statut'],
        'createdAt' => $row['date_creation'],
        'updatedAt' => $row['date_maj'],
    ];
}

function set_entretien_slots($pdo, $entretienId, $slots){
    $pdo->prepare('UPDATE entretiens SET creneau_selectionne_id = NULL WHERE id = ?')->execute([$entretienId]);
    $pdo->prepare('DELETE FROM creneaux_entretien WHERE entretien_id = ?')->execute([$entretienId]);
    $insert = $pdo->prepare('INSERT INTO creneaux_entretien (entretien_id, date_heure) VALUES (?, ?)');
    foreach ($slots as $slot) {
        $slot = trim($slot);
        if ($slot === '') continue;
        $insert->execute([$entretienId, str_replace('T', ' ', $slot)]);
    }
}

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM entretiens WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        respond($row ? shape_entretien($row, $pdo) : null);
    }
    if ($action === 'getByApplication') {
        $stmt = $pdo->prepare('SELECT * FROM entretiens WHERE candidature_id = ?');
        $stmt->execute([$_GET['candidatureId'] ?? 0]);
        $row = $stmt->fetch();
        respond($row ? shape_entretien($row, $pdo) : null);
    }
    if ($action === 'getByCandidate') {
        $stmt = $pdo->prepare('SELECT e.* FROM entretiens e JOIN candidatures ca ON ca.id = e.candidature_id WHERE ca.candidat_id = ?');
        $stmt->execute([$_GET['candidatId'] ?? 0]);
        respond(array_map(fn($r) => shape_entretien($r, $pdo), $stmt->fetchAll()));
    }
    if ($action === 'getByCompany') {
        $stmt = $pdo->prepare('SELECT e.* FROM entretiens e JOIN candidatures ca ON ca.id = e.candidature_id JOIN offres o ON o.id = ca.offre_id WHERE o.entreprise_id = ?');
        $stmt->execute([$_GET['entrepriseId'] ?? 0]);
        respond(array_map(fn($r) => shape_entretien($r, $pdo), $stmt->fetchAll()));
    }
    $rows = $pdo->query('SELECT * FROM entretiens')->fetchAll();
    respond(array_map(fn($r) => shape_entretien($r, $pdo), $rows));
}

if ($method === 'POST') {
    require_role('recruteur');
    $in = json_body();
    $now = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare('INSERT INTO entretiens (candidature_id, mode, lieu_ou_lien, statut, date_creation, date_maj) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$in['applicationId'], $in['mode'] ?? 'video', $in['lieuOuLien'] ?? '', 'proposee', $now, $now]);
    $id = (int)$pdo->lastInsertId();
    set_entretien_slots($pdo, $id, $in['slots'] ?? []);

    $stmt = $pdo->prepare('SELECT * FROM entretiens WHERE id = ?');
    $stmt->execute([$id]);
    respond(shape_entretien($stmt->fetch(), $pdo), 201);
}

if ($method === 'PUT') {
    $in = json_body();
    $id = $_GET['id'] ?? ($in['id'] ?? null);
    if (!$id) respond_error('id manquant.', 400);

    if ($action === 'selectSlot') {
        $slot = str_replace('T', ' ', trim($in['slot'] ?? ''));
        $find = $pdo->prepare('SELECT id FROM creneaux_entretien WHERE entretien_id = ? AND date_heure = ?');
        $find->execute([$id, $slot]);
        $slotId = $find->fetchColumn();
        if ($slotId) {
            $pdo->prepare("UPDATE entretiens SET creneau_selectionne_id = ?, statut = 'confirmee', date_maj = ? WHERE id = ?")
                ->execute([$slotId, date('Y-m-d H:i:s'), $id]);
        }
    } elseif ($action === 'cancel') {
        $pdo->prepare("UPDATE entretiens SET statut = 'annulee', date_maj = ? WHERE id = ?")->execute([date('Y-m-d H:i:s'), $id]);
    } else {
        $map = ['mode' => 'mode', 'lieuOuLien' => 'lieu_ou_lien', 'statut' => 'statut'];
        $sets = ['date_maj = ?']; $params = [date('Y-m-d H:i:s')];
        foreach ($map as $jsKey => $col) {
            if (array_key_exists($jsKey, $in)) { $sets[] = "$col = ?"; $params[] = $in[$jsKey]; }
        }
        if (array_key_exists('selectedSlot', $in) && $in['selectedSlot'] === null) {
            $sets[] = 'creneau_selectionne_id = NULL';
        }
        $params[] = $id;
        $pdo->prepare('UPDATE entretiens SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
        if (array_key_exists('slots', $in)) set_entretien_slots($pdo, $id, $in['slots']);
    }

    $stmt = $pdo->prepare('SELECT * FROM entretiens WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    respond($row ? shape_entretien($row, $pdo) : null);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) respond_error('id manquant.', 400);
    $pdo->prepare('DELETE FROM entretiens WHERE id = ?')->execute([$id]);
    respond(['ok' => true]);
}

respond_error('Méthode non supportée.', 405);
