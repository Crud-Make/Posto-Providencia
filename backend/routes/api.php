<?php

use App\Agregacao\Http\Controllers\AgregacaoController;
use App\Cadastro\Http\Controllers\CatalogoController;
use App\Cadastro\Http\Controllers\PresencaController;
use App\Cadastro\Http\Middleware\DefinePostoAtual;
use App\Fechamento\Http\Controllers\EnvioDoFrentistaController;
use App\Fechamento\Http\Controllers\FechamentoController;
use App\Fechamento\Http\Controllers\FechamentoFrentistaController;
use App\Fechamento\Http\Controllers\LeituraController;
use App\Pessoas\Http\Controllers\AcessoDoFrentistaController;
use App\Pessoas\Http\Controllers\AutenticacaoController;
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
| Login próprio da API (#102, docs/design/autenticacao.md §5). Sanctum em modo token.
| `throttle:6,1`: seis tentativas por minuto por IP — o bastante para quem erra a senha, pouco
| para quem tenta adivinhar.
*/
Route::post('/login', [AutenticacaoController::class, 'entrar'])->middleware('throttle:6,1');
Route::middleware('token.atual')->group(function (): void {
    Route::get('/eu', [AutenticacaoController::class, 'eu']);
    Route::post('/sair', [AutenticacaoController::class, 'sair']);
});

/*
| Catálogo do posto — só leitura (#97, docs/design/cadastro.md). `{posto}` vira o PostoAtual.
| Ainda SEM token: fechar o catálogo é fatia própria (pendência em docs/design/cadastro.md).
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

/*
|--------------------------------------------------------------------------
| Rotas PROTEGIDAS (DECISÃO A — docs/design/autenticacao.md §3b)
|--------------------------------------------------------------------------
| A partir da #102 toda rota nova nasce aqui, não no grupo público acima. A ordem é
| obrigatória: `token.atual` diz QUEM é, `DefinePostoAtual` resolve o `{posto}` e define o
| `PostoAtual` que escopa os models, e `posto.acesso` pergunta à PostoPolicy se esse usuário
| alcança ESTE posto. A policy precisa do posto já resolvido, por isso vem depois.
|
| O catálogo acima continua público de propósito: a P4a/P4b já o consome sem token, e
| fechá-lo é fatia própria (pendência em docs/design/cadastro.md). Ele ainda expõe dado que não
| devia ser público: preco_custo/preco_venda (combustiveis, e tanques e bicos, que trazem o
| combustível), taxa (formas-pagamento, maquininhas), cnpj/contato (fornecedores) e
| telefone/data_admissao (frentistas). O dashboard saiu de lá e mora aqui (#103).
*/
Route::prefix('postos/{posto}')
    ->middleware(['token.atual', DefinePostoAtual::class, 'posto.acesso'])
    ->group(function (): void {
        // Encerrantes do dia (#103 P5). Dinheiro e litros saem como string decimal.
        Route::get('leituras', [LeituraController::class, 'index']);

        // Envios dos frentistas do dia (#103 P6). Balde não informado sai null, nunca '0.00'.
        Route::get('sessoes', [FechamentoFrentistaController::class, 'index']);
        // Quem está no posto agora (card do Dashboard). Protegida: leva a foto do frentista.
        Route::get('presencas', [PresencaController::class, 'index']);

        // O fechamento do dia, com recebimentos (#103 P7). Dia sem fechamento é 200 com data null.
        Route::get('fechamento', [FechamentoController::class, 'show']);

        // Grava o dia (#103 P11). Só quem GERE o posto: `posto.acesso:gerir` sobe a habilidade
        // nesta rota (o `posto.acesso` do grupo, que é `ver`, continua rodando antes). Corpo em
        // string decimal; recusa de forma ou de domínio é 422 { erro: { codigo, mensagem, campos? } }.
        Route::put('fechamento', [FechamentoController::class, 'update'])->middleware('posto.acesso:gerir');

        // Agregação — dado bruto do período para o dashboard do proprietário (#100,
        // docs/design/agregacao.md §5). Sem lucro no servidor: quem calcula é packages/utils.
        // Custo e despesa são dado de proprietário (decisão do dono, 22/09/2026): só quem GERE o
        // posto, como o PUT acima. Operador vinculado vê o dia, não o dashboard (403).
        Route::get('dashboard', [AgregacaoController::class, 'dashboard'])->middleware('posto.acesso:gerir');
    });

/*
|--------------------------------------------------------------------------
| PWA do FRENTISTA (#101, docs/design/fechamento-frentista-api.md §4 e §6)
|--------------------------------------------------------------------------
| O frentista entra por PIN (decisão do dono, 19/09/2026) e recebe um token curto, que só abre as
| rotas abaixo. `frentista.do.posto` confere que o token é de FRENTISTA e que ele é deste `{posto}`
| (401/403) e deixa o `frentista_id` do token nos atributos: é dele, e nunca do corpo, que sai quem
| está enviando. O token do gerente não passa aqui, e o do frentista não passa no `token.atual`.
|
| `throttle:pin-frentista` (AppServiceProvider): 10 tentativas por minuto por IP e 5 por frentista —
| o PIN é curto, então o limite por frentista é o que segura a adivinhação vinda de vários IPs.
*/
Route::post('postos/{posto}/frentistas/entrar', [AcessoDoFrentistaController::class, 'entrar'])
    ->middleware([DefinePostoAtual::class, 'throttle:pin-frentista']);

Route::prefix('postos/{posto}')
    ->middleware([DefinePostoAtual::class, 'frentista.do.posto'])
    ->group(function (): void {
        // O fechamento do turno do frentista do token. Idempotente pela `chave` do corpo.
        Route::post('envios', [EnvioDoFrentistaController::class, 'store']);
        // Sinal de vida; `visto_em` é a hora do servidor (trigger carimba_visto_em).
        Route::post('presenca', [PresencaController::class, 'marcar']);
    });
