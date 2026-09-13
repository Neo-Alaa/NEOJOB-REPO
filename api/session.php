<?php
/* NeoJob API — PHP session handling (replaces the old Auth/localStorage
 * simulation). Front-end and API are served from the same origin
 * (php -S), so a plain session cookie is all that's needed. */

session_start();

function current_user(){
    return $_SESSION['user'] ?? null;
}


/** Call at the top of any endpoint that requires a logged-in user.
 *  $roles is a role string, an array of allowed roles, or null for "any". */
function require_role($roles = null){
    $user = current_user();
    if (!$user) {
        respond_error('Non authentifié.', 401);
    }
    if ($roles !== null) {
        $allowed = is_array($roles) ? $roles : [$roles];
        if (!in_array($user['role'], $allowed, true)) {
            respond_error('Accès refusé.', 403);
        }
    }
    return $user;
}
