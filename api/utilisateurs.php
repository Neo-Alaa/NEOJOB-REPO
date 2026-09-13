<?php
/* NeoJob API — utilisateurs.php (mirrors the `Users` helper). Never returns password_hash.
 * GET  ?                              -> all users
 * GET  ?id=1
 * GET  ?action=getByEmail&email=...
 * PUT  ?action=setStatus&id=1         body: {status}
 * PUT  ?action=markNotificationsSeen&id=1
 * PUT  ?                              body: {id, ...changes}
 * DELETE ?id=1
 */
require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function shape_user($row){
    return [
        'id' => (int)$row['id'],
        'email' => $row['email'],
        'role' => $row['role'],
        'status' => $row['statut'],
        'createdAt' => $row['date_creation'],
        'lastSeenNotifAt' => $row['derniere_notif_vue'],
    ];
}

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM utilisateurs WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        respond($row ? shape_user($row) : null);
    }
    if ($action === 'getByEmail') {
        $stmt = $pdo->prepare('SELECT * FROM utilisateurs WHERE email = ?');
        $stmt->execute([$_GET['email'] ?? '']);
        $row = $stmt->fetch();
        respond($row ? shape_user($row) : null);
    }
    require_role('admin');
    $rows = $pdo->query('SELECT * FROM utilisateurs')->fetchAll();
    respond(array_map('shape_user', $rows));
}

if ($method === 'PUT') {
    $in = json_body();
    $id = $_GET['id'] ?? ($in['id'] ?? null);
    if (!$id) respond_error('id manquant.', 400);

    if ($action === 'markNotificationsSeen') {
        $pdo->prepare('UPDATE utilisateurs SET derniere_notif_vue = ? WHERE id = ?')->execute([date('Y-m-d H:i:s'), $id]);
    } elseif ($action === 'setStatus') {
        require_role('admin');
        $pdo->prepare('UPDATE utilisateurs SET statut = ? WHERE id = ?')->execute([$in['status'], $id]);
    } else {
        require_role('admin');
        if (array_key_exists('email', $in)) {
            $pdo->prepare('UPDATE utilisateurs SET email = ? WHERE id = ?')->execute([$in['email'], $id]);
        }
    }

    $stmt = $pdo->prepare('SELECT * FROM utilisateurs WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    respond($row ? shape_user($row) : null);
}

if ($method === 'DELETE') {
    $user = require_role();
    $id = $_GET['id'] ?? null;
    if (!$id) respond_error('id manquant.', 400);
    // Admins can remove any account; everyone else can only delete their own.
    if ($user['role'] !== 'admin' && (int)$id !== (int)$user['userId']) {
        respond_error('Accès refusé.', 403);
    }
    $pdo->prepare('DELETE FROM utilisateurs WHERE id = ?')->execute([$id]);
    if ((int)$id === (int)$user['userId']) { $_SESSION = []; session_destroy(); }
    respond(['ok' => true]);
}

respond_error('Méthode non supportée.', 405);
