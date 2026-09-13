<?php
/* NeoJob API — auth.php
 * action=login    POST {email, password}
 * action=logout   POST
 * action=current  GET  -> the logged-in user, or null
 * action=register POST {email, password, role, ...profile fields}
 */

require 'config.php';
require 'helpers.php';
require 'session.php';

$action = $_GET['action'] ?? '';

if ($action === 'current') {
    respond(current_user());
}

if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_body();
    $stmt = $pdo->prepare('SELECT * FROM utilisateurs WHERE email = ?');
    $stmt->execute([$in['email'] ?? '']);
    $user = $stmt->fetch();

    if (!$user || !password_verify($in['password'] ?? '', $user['password_hash'])) {
        respond_error('Email ou mot de passe incorrect.', 401);
    }
    if ($user['statut'] === 'blocked') {
        respond_error('Ce compte a été bloqué.', 403);
    }

    $_SESSION['user'] = ['userId' => (int)$user['id'], 'email' => $user['email'], 'role' => $user['role']];
    respond($_SESSION['user']);
}

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    respond(['ok' => true]);
}

if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_body();
    $email = trim($in['email'] ?? '');
    $password = $in['password'] ?? '';
    $role = $in['role'] ?? '';

    if (!$email || !$password || !in_array($role, ['candidat', 'recruteur'], true)) {
        respond_error('Champs manquants ou rôle invalide.', 400);
    }

    $stmt = $pdo->prepare('SELECT id FROM utilisateurs WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        respond_error('Un compte existe déjà avec cet email.', 409);
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO utilisateurs (email, password_hash, role) VALUES (?, ?, ?)');
        $stmt->execute([$email, password_hash($password, PASSWORD_DEFAULT), $role]);
        $userId = (int)$pdo->lastInsertId();

        if ($role === 'candidat') {
            $stmt = $pdo->prepare('INSERT INTO candidats (utilisateur_id, prenom, nom) VALUES (?, ?, ?)');
            $stmt->execute([$userId, $in['prenom'] ?? '', $in['nom'] ?? '']);
        } else {
            $stmt = $pdo->prepare('INSERT INTO entreprises (utilisateur_id, nom, secteur) VALUES (?, ?, ?)');
            $stmt->execute([$userId, $in['nom'] ?? '', $in['secteur'] ?? '']);
        }

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        respond_error("Erreur lors de la création du compte.", 500);
    }

    $_SESSION['user'] = ['userId' => $userId, 'email' => $email, 'role' => $role];
    respond($_SESSION['user'], 201);
}

if ($action === 'changePassword' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = require_role();
    $in = json_body();
    $stmt = $pdo->prepare('SELECT password_hash FROM utilisateurs WHERE id = ?');
    $stmt->execute([$user['userId']]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($in['currentPassword'] ?? '', $row['password_hash'])) {
        respond_error('Le mot de passe actuel est incorrect.', 401);
    }
    if (strlen($in['newPassword'] ?? '') < 6) {
        respond_error('Le nouveau mot de passe doit contenir au moins 6 caractères.', 400);
    }

    $pdo->prepare('UPDATE utilisateurs SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($in['newPassword'], PASSWORD_DEFAULT), $user['userId']]);
    respond(['ok' => true]);
}

respond_error('Action inconnue.', 404);
