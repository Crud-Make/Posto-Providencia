<?php

use App\Agregacao\Http\Controllers\AgregacaoController;
use App\Cadastro\Http\Controllers\CatalogoController;
use App\Cadastro\Http\Middleware\DefinePostoAtual;
use App\Fechamento\Http\Controllers\LeituraController;
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

    // Agregação — dado bruto do período para o dashboard do proprietário (#100,
    // docs/design/agregacao.md §5). Sem lucro no servidor: quem calcula é packages/utils.
    Route::get('dashboard', [AgregacaoController::class, 'dashboard']);
});

/*
|--------------------------------------------------------------------------
| Rotas PROTEGIDAS (DECISÃO A — docs/design/autenticacao.md §3b)
|--------------------------------------------------------------------------
| A partir da #102 toda rota nova nasce aqui, não no grupo público acima. A ordem é
| obrigatória: `token.atual` diz QUEM é, `DefinePostoAtual` resolve o `{posto}` e define o
| `PostoAtual` que escopa os models, e `posto.acesso` pergunta à PostoPolicy se esse usuário
| alcança ESTE posto. A policy precisa do posto já resolvido, por isso vem depois.
|
| O grupo público acima continua público de propósito: a P4a/P4b já o consome sem token, e
| fechá-lo é fatia própria (pendência em docs/design/cadastro.md).
*/
Route::prefix('postos/{posto}')
    ->middleware(['token.atual', DefinePostoAtual::class, 'posto.acesso'])
    ->group(function (): void {
        // Encerrantes do dia (#103 P5). Dinheiro e litros saem como string decimal.
        Route::get('leituras', [LeituraController::class, 'index']);
    });
