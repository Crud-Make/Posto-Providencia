<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rotas da API (prefixo /api)
|--------------------------------------------------------------------------
| Endpoints de negócio nascem por módulo (Design Doc §2) nas issues #97+.
| Aqui fica só o que é transversal.
*/

/**
 * Saúde da API: responde se o processo está de pé e se o Postgres do posto responde.
 * É o critério de pronto da #96 e o que o healthcheck do docker-compose consulta.
 * Sem banco a API ainda responde: o status diz o que falta, o log diz por quê e, em
 * APP_DEBUG, o motivo vem no corpo.
 */
Route::get('/saude', function () {
    $banco = 'indisponivel';
    $motivo = null;
    try {
        $banco = DB::selectOne('select current_database() as nome')->nome;
    } catch (Throwable $erro) {
        report($erro);
        $motivo = config('app.debug') ? $erro->getMessage() : null;
    }

    return response()->json(array_filter([
        'status' => $banco === 'indisponivel' ? 'degradado' : 'ok',
        'banco' => $banco,
        'versao' => app()->version(),
        'motivo' => $motivo,
    ]), $banco === 'indisponivel' ? 503 : 200);
});
