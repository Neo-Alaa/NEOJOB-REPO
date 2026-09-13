<?php
/* NeoJob API — categories.php (mirrors the `Categories` helper) */
require 'config.php';
require 'helpers.php';
require 'session.php';

$method = $_SERVER['REQUEST_METHOD'];

function shape_categorie($row){ return ['id' => (int)$row['id'], 'nom' => $row['nom']]; }

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        respond($row ? shape_categorie($row) : null);
    }
    $rows = $pdo->query('SELECT * FROM categories ORDER BY nom')->fetchAll();
    respond(array_map('shape_categorie', $rows));
}

if ($method === 'POST') {
    require_role('admin');
    $in = json_body();
    $pdo->prepare('INSERT INTO categories (nom) VALUES (?)')->execute([$in['nom'] ?? '']);
    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
    $stmt->execute([$id]);
    respond(shape_categorie($stmt->fetch()), 201);
}

if ($method === 'PUT') {
    require_role('admin');
    $in = json_body();
    $id = $_GET['id'] ?? ($in['id'] ?? null);
    if (!$id) respond_error('id manquant.', 400);
    if (array_key_exists('nom', $in)) {
        $pdo->prepare('UPDATE categories SET nom = ? WHERE id = ?')->execute([$in['nom'], $id]);
    }
    $stmt = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    respond($row ? shape_categorie($row) : null);
}

if ($method === 'DELETE') {
    require_role('admin');
    $id = $_GET['id'] ?? null;
    if (!$id) respond_error('id manquant.', 400);
    $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
    respond(['ok' => true]);
}

respond_error('Méthode non supportée.', 405);
