<?php

use App\Cadastro\Http\Controllers\CatalogoController;
use App\Cadastro\Http\Middleware\DefinePostoAtual;
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
        // selectOne devolve mixed: estreita em vez de confiar (PHPStan nível 9).
        $linha = DB::selectOne('select current_database() as nome');
        $banco = is_object($linha) && isset($linha->nome) && is_string($linha->nome) ? $linha->nome : 'indisponivel';
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

/*
| Catálogo do posto — só leitura (#97, docs/design/cadastro.md). `{posto}` vira o PostoAtual;
| autorização por PostoPolicy entra nas rotas na #102, quando houver usuário autenticado.
*/
Route::prefix('postos/{posto}')->middleware(DefinePostoAtual::class)->group(function (): void {
    Route::get('combustiveis', [CatalogoController::class, 'combustiveis']);
    Route::get('tanques', [CatalogoController::class, 'tanques']);
    Route::get('bombas', [CatalogoController::class, 'bombas']);
    Route::get('bicos', [CatalogoController::class, 'bicos']);
    Route::get('turnos', [CatalogoController::class, 'turnos']);
    Route::get('frentistas', [CatalogoController::class, 'frentistas']);
    Route::get('formas-pagamento', [CatalogoController::class, 'formasPagamento']);
    Route::get('maquininhas', [CatalogoController::class, 'maquininhas']);
    Route::get('fornecedores', [CatalogoController::class, 'fornecedores']);
});
