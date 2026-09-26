<?php

declare(strict_types=1);

use App\Cadastro\Domain\Frentista;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\FechamentoFrentista;
use App\Pessoas\Domain\AcessoFrentista;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\json;
use function Pest\Laravel\postJson;
use function Pest\Laravel\withToken;

require_once __DIR__.'/../PwaFrentista/Cenario.php';

/*
|--------------------------------------------------------------------------
| Tela Frentistas do painel pela API (#103, docs/design/painel-pela-api.md §10)
|--------------------------------------------------------------------------
| Os EFEITOS são os de `useFrentistas` + `frentistaService` no Supabase: a lista traz ativos e
| inativos por nome; criar grava nome, admissão (meia-noite UTC) e status; editar grava os mesmos
| três e mais nada; "Excluir" é `ativo = false`. O que muda por ser multi-tenant: o posto é o da rota,
| e frentista de outro posto é 404.
*/

/** Token de OPERADOR (login da API) com vínculo de operador ao `$posto`. */
function tokenDoOperadorEq(Posto $posto): string
{
    $email = 'operador.'.$posto->id.'.'.bin2hex(random_bytes(3)).'@teste.com';
    $operador = Usuario::factory()->create(['email' => $email, 'role' => Role::Operador, 'senha' => 'senha-do-operador-1']);
    UsuarioPosto::factory()->create(['usuario_id' => $operador->id, 'posto_id' => $posto->id, 'role' => PapelNoPosto::Operador]);
    $token = postJson('/api/login', ['email' => $email, 'senha' => 'senha-do-operador-1'])->assertOk()->json('token');

    return is_string($token) ? $token : throw new RuntimeException('login do operador sem token');
}

/**
 * Os cinco pedidos da tela contra o frentista `$alvo` do `$posto`.
 *
 * @return list<array{0: string, 1: string, 2: array<string, mixed>}>
 */
function pedidosDaEquipe(Posto $posto, Frentista $alvo): array
{
    $corpo = ['nome' => 'Invasor', 'data_admissao' => '2026-02-01', 'ativo' => true];

    return [
        ['GET', "/api/postos/{$posto->id}/equipe", []],
        ['POST', "/api/postos/{$posto->id}/equipe", $corpo],
        ['PUT', "/api/postos/{$posto->id}/equipe/{$alvo->id}", $corpo],
        ['POST', "/api/postos/{$posto->id}/equipe/{$alvo->id}/desativar", []],
        ['GET', "/api/postos/{$posto->id}/equipe/{$alvo->id}/historico", []],
    ];
}

/**
 * Frentista do `$posto` (fora do escopo de qualquer PostoAtual).
 *
 * @param  array<string, mixed>  $atributos
 */
function frentistaEq(Posto $posto, array $atributos = []): Frentista
{
    return Frentista::factory()->create(array_merge(['posto_id' => $posto->id], $atributos));
}

/** Tokens de PIN do frentista (o dono é o AcessoFrentista; `tokenable_id` sozinho colide com o do gerente). */
function sessoesDoFrentistaEq(Frentista $frentista): int
{
    return DB::table('personal_access_tokens')
        ->where('tokenable_type', (new AcessoFrentista)->getMorphClass())
        ->where('tokenable_id', $frentista->id)
        ->count();
}

/** Uma coluna da linha como o banco a tem agora (sem o model, para não passar pelo escopo). */
function colunaEq(Frentista $frentista, string $coluna): mixed
{
    return DB::table('Frentista')->where('id', $frentista->id)->value($coluna);
}

/** @return list<mixed> */
function colunasEq(Frentista $frentista): array
{
    return array_map(static fn (string $c): mixed => colunaEq($frentista, $c), ['cpf', 'telefone', 'foto', 'turno_id', 'posto_id']);
}

it('sem token: 401 em todas as rotas, e nada muda', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();

    foreach (pedidosDaEquipe($posto, $frentista) as [$metodo, $url, $corpo]) {
        json($metodo, $url, $corpo)->assertUnauthorized();
    }

    expect(colunaEq($frentista, 'ativo'))->toBeTrue()
        ->and(DB::table('Frentista')->where('posto_id', $posto->id)->count())->toBe(1);
});

it('operador do posto: 403 em todas — gestão de equipe é de quem GERE', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $token = tokenDoOperadorEq($posto);

    foreach (pedidosDaEquipe($posto, $frentista) as [$metodo, $url, $corpo]) {
        withToken($token)->json($metodo, $url, $corpo)->assertForbidden();
    }

    expect(colunaEq($frentista, 'ativo'))->toBeTrue()
        ->and(DB::table('Frentista')->where('posto_id', $posto->id)->count())->toBe(1);
});

it('ISOLAMENTO: gerente do Jorro leva 403 em todas as rotas do BR, e nada muda lá', function (): void {
    ['posto' => $jorro] = postoDoPwa();
    ['posto' => $br, 'frentista' => $doBr] = postoDoPwa();
    $token = tokenDoGerente($jorro);

    foreach (pedidosDaEquipe($br, $doBr) as [$metodo, $url, $corpo]) {
        withToken($token)->json($metodo, $url, $corpo)->assertForbidden();
    }

    expect(colunaEq($doBr, 'nome'))->toBe($doBr->nome)
        ->and(colunaEq($doBr, 'ativo'))->toBeTrue()
        ->and(DB::table('Frentista')->where('posto_id', $br->id)->count())->toBe(1);
});

it('ISOLAMENTO: frentista do BR não é editável, desativável nem lido pelo id na rota do Jorro (404)', function (): void {
    ['posto' => $jorro] = postoDoPwa();
    ['posto' => $br, 'frentista' => $doBr] = postoDoPwa();
    $token = tokenDoGerente($jorro);
    $base = "/api/postos/{$jorro->id}/equipe/{$doBr->id}";

    withToken($token)->putJson($base, ['nome' => 'Invasor', 'data_admissao' => '2026-02-01', 'ativo' => false])->assertNotFound();
    withToken($token)->postJson("{$base}/desativar")->assertNotFound();
    withToken($token)->getJson("{$base}/historico")->assertNotFound();

    expect(colunaEq($doBr, 'nome'))->toBe($doBr->nome)
        ->and(colunaEq($doBr, 'ativo'))->toBeTrue();
});

it('lista ativos E inativos do posto, por nome, com a foto e sem CPF nem telefone', function (): void {
    ['posto' => $posto, 'frentista' => $pwa] = postoDoPwa();
    $pwa->forceFill(['nome' => 'Bruno'])->save();
    $carla = frentistaEq($posto, ['nome' => 'Carla', 'ativo' => false, 'foto' => 'data:image/jpeg;base64,AAAA', 'data_admissao' => '2025-03-10 00:00:00']);
    frentistaEq($posto, ['nome' => 'Ana']);
    ['posto' => $vizinho] = postoDoPwa();
    frentistaEq($vizinho, ['nome' => 'Aaron do vizinho']);

    withToken(tokenDoGerente($posto))->getJson("/api/postos/{$posto->id}/equipe")
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.nome', 'Ana')
        ->assertJsonPath('data.1.nome', 'Bruno')
        ->assertJsonPath('data.2', [
            'id' => $carla->id, 'nome' => 'Carla', 'data_admissao' => '2025-03-10T00:00:00Z',
            'ativo' => false, 'foto' => 'data:image/jpeg;base64,AAAA',
        ])
        ->assertJsonMissingPath('data.0.cpf')
        ->assertJsonMissingPath('data.0.telefone');
});

it('cadastra no posto da ROTA (posto_id do corpo é ignorado), com admissão à meia-noite UTC', function (): void {
    ['posto' => $posto] = postoDoPwa();
    ['posto' => $vizinho] = postoDoPwa();

    $resposta = withToken(tokenDoGerente($posto))
        ->postJson("/api/postos/{$posto->id}/equipe", ['nome' => '  Davi Souza ', 'data_admissao' => '2026-09-01', 'ativo' => true, 'posto_id' => $vizinho->id])
        ->assertCreated()
        ->assertJsonPath('data.nome', 'Davi Souza')
        ->assertJsonPath('data.data_admissao', '2026-09-01T00:00:00Z')
        ->assertJsonPath('data.ativo', true)
        ->assertJsonPath('data.foto', null);

    $criado = Frentista::query()->findOrFail(idDaResposta($resposta->json('data.id')));
    expect($criado->posto_id)->toBe($posto->id)
        ->and([$criado->cpf, $criado->telefone, $criado->user_id])->toBe([null, null, null])
        ->and(DB::table('Frentista')->where('posto_id', $vizinho->id)->count())->toBe(1);
});

it('edita nome, admissão e status — e não toca CPF, telefone, foto, turno nem posto', function (): void {
    ['posto' => $posto] = postoDoPwa();
    $frentista = frentistaEq($posto, ['foto' => 'data:image/jpeg;base64,BBBB']);
    $antes = colunasEq($frentista);

    withToken(tokenDoGerente($posto))
        ->putJson("/api/postos/{$posto->id}/equipe/{$frentista->id}", ['nome' => 'Eva Lima', 'data_admissao' => '2024-12-31', 'ativo' => true])
        ->assertOk()
        ->assertJsonPath('data.nome', 'Eva Lima')
        ->assertJsonPath('data.data_admissao', '2024-12-31T00:00:00Z');

    expect(colunaEq($frentista, 'nome'))->toBe('Eva Lima')
        ->and(colunasEq($frentista))->toBe($antes);
});

it('desativar é ativo=false (nada apagado) e DERRUBA as sessões de PIN abertas do frentista', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $sessao = tokenDoFrentista($posto, $frentista);
    withToken($sessao)->getJson("/api/postos/{$posto->id}/frentistas/eu")->assertOk();
    app('auth')->forgetGuards();

    withToken(tokenDoGerente($posto))->postJson("/api/postos/{$posto->id}/equipe/{$frentista->id}/desativar")
        ->assertOk()->assertJsonPath('data.ativo', false);

    expect(colunaEq($frentista, 'ativo'))->toBeFalse()
        ->and(sessoesDoFrentistaEq($frentista))->toBe(0);

    // Reativado pela edição, o token de antes NÃO volta a valer: entra de novo pelo PIN.
    app('auth')->forgetGuards();
    withToken(tokenDoGerente($posto))->putJson("/api/postos/{$posto->id}/equipe/{$frentista->id}", ['nome' => $frentista->nome, 'data_admissao' => '2026-01-01', 'ativo' => true])->assertOk();
    app('auth')->forgetGuards();
    withToken($sessao)->getJson("/api/postos/{$posto->id}/frentistas/eu")->assertUnauthorized();
});

it('editar para Inativo também derruba as sessões; o inativo não entra pelo PIN', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    tokenDoFrentista($posto, $frentista);
    app('auth')->forgetGuards();

    withToken(tokenDoGerente($posto))
        ->putJson("/api/postos/{$posto->id}/equipe/{$frentista->id}", ['nome' => $frentista->nome, 'data_admissao' => '2026-01-01', 'ativo' => false])
        ->assertOk();

    expect(sessoesDoFrentistaEq($frentista))->toBe(0);
    postJson("/api/postos/{$posto->id}/frentistas/entrar", ['frentista_id' => $frentista->id, 'pin' => PIN_PWA])->assertUnauthorized();
});

it('desativar outro frentista não derruba a sessão de ninguém mais', function (): void {
    ['posto' => $posto, 'frentista' => $fica] = postoDoPwa();
    $sai = frentistaDoPwa($posto);
    $sessao = tokenDoFrentista($posto, $fica);
    app('auth')->forgetGuards();

    withToken(tokenDoGerente($posto))->postJson("/api/postos/{$posto->id}/equipe/{$sai->id}/desativar")->assertOk();
    app('auth')->forgetGuards();

    withToken($sessao)->getJson("/api/postos/{$posto->id}/frentistas/eu")->assertOk();
});

it('forma: ativo em texto ou 1, data BR, nome vazio e sem campo são 422 corpo_invalido, e nada é gravado', function (array $corpo): void {
    ['posto' => $posto] = postoDoPwa();

    withToken(tokenDoGerente($posto))->postJson("/api/postos/{$posto->id}/equipe", $corpo)
        ->assertUnprocessable()
        ->assertJsonPath('erro.codigo', 'corpo_invalido');

    expect(DB::table('Frentista')->where('posto_id', $posto->id)->count())->toBe(1);
})->with([
    'ativo em texto' => [['nome' => 'X', 'data_admissao' => '2026-01-01', 'ativo' => 'true']],
    'ativo como 1' => [['nome' => 'X', 'data_admissao' => '2026-01-01', 'ativo' => 1]],
    'data BR' => [['nome' => 'X', 'data_admissao' => '01/01/2026', 'ativo' => true]],
    'nome vazio' => [['nome' => '   ', 'data_admissao' => '2026-01-01', 'ativo' => true]],
    'sem admissão' => [['nome' => 'X', 'ativo' => true]],
]);

it('histórico: os 30 envios mais novos do frentista, com dia, turno e diferença, só deste posto', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    app(PostoAtual::class)->definir($posto->id);
    foreach (range(1, 32) as $dia) {
        $pai = Fechamento::factory()->create(['data' => sprintf('2026-01-%02d', min($dia, 31)).($dia > 31 ? ' 12:00:00' : ''), 'turno_id' => 1]);
        FechamentoFrentista::factory()->create(['fechamento_id' => $pai->id, 'frentista_id' => $frentista->id, 'diferenca_calculada' => $dia === 32 ? '10.00' : '0.00']);
    }
    app(PostoAtual::class)->limpar();

    $resposta = withToken(tokenDoGerente($posto))->getJson("/api/postos/{$posto->id}/equipe/{$frentista->id}/historico")
        ->assertOk()
        ->assertJsonCount(30, 'data')
        ->assertJsonPath('data.0.diferenca_calculada', '10.00')
        ->assertJsonPath('data.0.fechamento', ['data' => '2026-01-31', 'turno_id' => 1])
        ->assertJsonPath('data.1.diferenca_calculada', '0.00');

    expect(idDaResposta($resposta->json('data.1.id')))->toBeLessThan(idDaResposta($resposta->json('data.0.id')));
});

it('o frentista desativado some das rotas de frentista na hora (o guard confere ativo)', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $sessao = tokenDoFrentista($posto, $frentista);
    // Desativado POR FORA (como o Supabase fazia): o token ainda existe, mas o guard recusa.
    DB::table('Frentista')->where('id', $frentista->id)->update(['ativo' => false]);
    app('auth')->forgetGuards();

    getJson("/api/postos/{$posto->id}/frentistas/eu")->assertUnauthorized();
    withToken($sessao)->getJson("/api/postos/{$posto->id}/frentistas/eu")->assertUnauthorized();
});
