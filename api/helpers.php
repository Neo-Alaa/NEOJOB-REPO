<?php
/* NeoJob API — small shared response/request helpers used by every endpoint. */

header('Content-Type: application/json; charset=utf-8');

function json_body(){
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond($data, $code = 200){
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function respond_error($message, $code = 400){
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

/** true/false form-fields arrive from JS as JSON booleans already; this is
 *  only needed where a value comes in as the string "true"/"false" (e.g. a
 *  query-string flag like ?remote=true). */
function to_bool($v){
    return $v === true || $v === 'true' || $v === '1' || $v === 1;
}
