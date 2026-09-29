<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\Tanque;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\json;
use function Pest\Laravel\postJson;
use function Pest\Laravel\withToken;

require_once __DIR__.'/../PwaFrentista/Cenario.php';

/*
|--------------------------------------------------------------------------
| Cadastro de bombas e bicos pelo painel (#153)
|--------------------------------------------------------------------------
| O Posto BR tem 24 bicos e a divisão real ainda não veio: o gerente de cada posto monta as bombas
| e os bicos pela tela, em vez de o seed ser reescrito. O posto é o da rota; bomba, combustível e
| tanque de outro posto não existem para quem cadastra (422), bico de outro posto é 404. Nada se
| apaga: desativar é `ativo = false`. Bico com leitura lançada não troca de combustível — a aba
| Fechamento Mensal dá nome às leituras antigas pelo catálogo do bico (`bico.api.ts`).
*/

/** Token de OPERADOR (login da API) com vínculo de operador ao `$posto`. */
function tokenDoOperadorCb(Posto $posto): string
{
    $email = 'operador.cb.'.$posto->id.'.'.bin2hex(random_bytes(3)).'@teste.com';
    $operador = Usuario::factory()->create(['email' => $email, 'role' => Role::Operador, 'senha' => 'senha-do-operador-1']);
    UsuarioPosto::factory()->create(['usuario_id' => $operador->id, 'posto_id' => $posto->id, 'role' => PapelNoPosto::Operador]);
    $token = postJson('/api/login', ['email' => $email, 'senha' => 'senha-do-operador-1'])->assertOk()->json('token');

    return is_string($token) ? $token : throw new RuntimeException('login do operador sem token');
}

/**
 * Catálogo mínimo de um posto: dois combustíveis, um tanque de cada e uma bomba.
 *
 * @return array{gc: Combustivel, et: Combustivel, tanqueGc: Tanque, tanqueEt: Tanque, bomba: Bomba}
 */
function catalogoCb(Posto $posto): array
{
    $gc = Combustivel::factory()->create(['posto_id' => $posto->id, 'nome' => 'Gasolina Comum']);
    $et = Combustivel::factory()->create(['posto_id' => $posto->id, 'nome' => 'Etanol']);

    return [
        'gc' => $gc,
        'et' => $et,
        'tanqueGc' => Tanque::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $gc->id]),
        'tanqueEt' => Tanque::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $et->id]),
        'bomba' => Bomba::factory()->create(['posto_id' => $posto->id, 'nome' => 'BOMBA 01', 'ativo' => true]),
    ];
}

/**
 * Corpo de bico válido para o catálogo `$c`, com as trocas de `$troca`.
 *
 * @param  array{gc: Combustivel, et: Combustivel, tanqueGc: Tanque, tanqueEt: Tanque, bomba: Bomba}  $c
 * @param  array<string, mixed>  $troca
 * @return array<string, mixed>
 */
function corpoDeBicoCb(array $c, array $troca = []): array
{
    return array_merge([
        'numero' => 7,
        'bomba_id' => $c['bomba']->id,
        'combustivel_id' => $c['gc']->id,
        'tanque_id' => $c['tanqueGc']->id,
        'ativo' => true,
    ], $troca);
}

/**
 * Bico do `$posto` já gravado (fora do escopo de qualquer PostoAtual).
 *
 * @param  array{gc: Combustivel, et: Combustivel, tanqueGc: Tanque, tanqueEt: Tanque, bomba: Bomba}  $c
 * @param  array<string, mixed>  $atributos
 */
function bicoCb(Posto $posto, array $c, array $atributos = []): Bico
{
    return Bico::factory()->create(array_merge([
        'posto_id' => $posto->id,
        'numero' => 1,
        'bomba_id' => $c['bomba']->id,
        'combustivel_id' => $c['gc']->id,
        'tanque_id' => $c['tanqueGc']->id,
        'ativo' => true,
    ], $atributos));
}

/** Uma leitura lançada no bico — é o que trava o combustível dele. */
function leituraNoBicoCb(Bico $bico): void
{
    DB::table('Leitura')->insert([
        'data' => '2026-09-20 00:00:00+00',
        'bico_id' => $bico->id,
        'combustivel_id' => $bico->combustivel_id,
        'leitura_inicial' => 100,
        'leitura_final' => 150,
        'litros_vendidos' => 50,
        'preco_litro' => 6.5,
        'valor_total' => 325,
        'usuario_id' => Usuario::factory()->create()->id,
        'posto_id' => $bico->posto_id,
    ]);
}

/** Uma coluna do bico como o banco a tem agora (sem o model, para não passar pelo escopo). */
function colunaDoBicoCb(Bico $bico, string $coluna): mixed
{
    return DB::table('Bico')->where('id', $bico->id)->value($coluna);
}

/**
 * Os quatro pedidos de escrita contra o `$posto`.
 *
 * @param  array{gc: Combustivel, et: Combustivel, tanqueGc: Tanque, tanqueEt: Tanque, bomba: Bomba}  $c
 * @return list<array{0: string, 1: string, 2: array<string, mixed>}>
 */
function pedidosDoCadastroCb(Posto $posto, array $c, Bico $bico): array
{
    $bomba = ['nome' => 'Invasora', 'localizacao' => null, 'ativo' => true];

    return [
        ['POST', "/api/postos/{$posto->id}/bombas", $bomba],
        ['PUT', "/api/postos/{$posto->id}/bombas/{$c['bomba']->id}", $bomba],
        ['POST', "/api/postos/{$posto->id}/bicos", corpoDeBicoCb($c)],
        ['PUT', "/api/postos/{$posto->id}/bicos/{$bico->id}", corpoDeBicoCb($c, ['numero' => 99])],
    ];
}

it('sem token 401, operador 403 e gerente de OUTRO posto 403 — e nada muda', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $c = catalogoCb($br);
    $bico = bicoCb($br, $c);
    $pedidos = pedidosDoCadastroCb($br, $c, $bico);

    foreach ($pedidos as [$metodo, $url, $corpo]) {
        json($metodo, $url, $corpo)->assertUnauthorized();
    }
    $operador = tokenDoOperadorCb($br);
    foreach ($pedidos as [$metodo, $url, $corpo]) {
        withToken($operador)->json($metodo, $url, $corpo)->assertForbidden();
    }
    app('auth')->forgetGuards();
    $doJorro = tokenDoGerente($jorro);
    foreach ($pedidos as [$metodo, $url, $corpo]) {
        withToken($doJorro)->json($metodo, $url, $corpo)->assertForbidden();
    }

    expect(DB::table('Bomba')->where('posto_id', $br->id)->count())->toBe(1)
        ->and(DB::table('Bico')->where('posto_id', $br->id)->count())->toBe(1)
        ->and(colunaDoBicoCb($bico, 'numero'))->toBe(1);
});

it('cria bomba no posto da rota — posto_id do corpo é ignorado', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $outro] = postoDoPwa();

    $resposta = withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/bombas", [
        'nome' => '  BOMBA 02 ', 'localizacao' => 'Ilha da frente', 'ativo' => true, 'posto_id' => $outro->id,
    ]);

    $resposta->assertCreated()->assertJsonPath('data.nome', 'BOMBA 02')
        ->assertJsonPath('data.localizacao', 'Ilha da frente')
        ->assertJsonPath('data.ativo', true);
    expect(DB::table('Bomba')->where('id', $resposta->json('data.id'))->value('posto_id'))->toBe($br->id);
});

it('nome de bomba repetido no posto é 422 nome_repetido; o mesmo nome em outro posto passa', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    catalogoCb($br);
    catalogoCb($jorro);

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/bombas", ['nome' => 'BOMBA 01', 'ativo' => true])
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'nome_repetido');
    app('auth')->forgetGuards();
    withToken(tokenDoGerente($jorro))->postJson("/api/postos/{$jorro->id}/bombas", ['nome' => 'BOMBA 09', 'ativo' => true])
        ->assertCreated();
    expect(DB::table('Bomba')->where('posto_id', $br->id)->count())->toBe(1);
});

it('cria bico com bomba, combustível e tanque do posto, e o GET bicos o devolve', function (): void {
    ['posto' => $br] = postoDoPwa();
    $c = catalogoCb($br);
    $token = tokenDoGerente($br);

    withToken($token)->postJson("/api/postos/{$br->id}/bicos", corpoDeBicoCb($c))
        ->assertCreated()
        ->assertJsonPath('data.numero', 7)
        ->assertJsonPath('data.ativo', true)
        ->assertJsonPath('data.bomba.id', $c['bomba']->id)
        ->assertJsonPath('data.combustivel.id', $c['gc']->id)
        ->assertJsonPath('data.tanque.id', $c['tanqueGc']->id);

    withToken($token)->getJson("/api/postos/{$br->id}/bicos")
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.numero', 7);
});

it('ISOLAMENTO: bomba, combustível ou tanque de OUTRO posto é 422 e nada é gravado', function (string $campo, string $codigo): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $c = catalogoCb($br);
    $doJorro = catalogoCb($jorro);
    $alheio = ['bomba_id' => $doJorro['bomba']->id, 'combustivel_id' => $doJorro['gc']->id, 'tanque_id' => $doJorro['tanqueGc']->id][$campo];

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/bicos", corpoDeBicoCb($c, [$campo => $alheio]))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', $codigo);

    expect(DB::table('Bico')->where('posto_id', $br->id)->count())->toBe(0);
})->with([
    'bomba' => ['bomba_id', 'bomba_invalida'],
    'combustível' => ['combustivel_id', 'combustivel_invalido'],
    'tanque' => ['tanque_id', 'tanque_invalido'],
]);

it('tanque de outro combustível é 422 tanque_invalido', function (): void {
    ['posto' => $br] = postoDoPwa();
    $c = catalogoCb($br);

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/bicos", corpoDeBicoCb($c, ['tanque_id' => $c['tanqueEt']->id]))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'tanque_invalido');
    expect(DB::table('Bico')->where('posto_id', $br->id)->count())->toBe(0);
});

it('bico ativo em bomba desativada é 422 bomba_invalida', function (): void {
    ['posto' => $br] = postoDoPwa();
    $c = catalogoCb($br);
    DB::table('Bomba')->where('id', $c['bomba']->id)->update(['ativo' => false]);

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/bicos", corpoDeBicoCb($c))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'bomba_invalida');
});

it('número repetido entre os bicos ATIVOS do posto é 422 numero_repetido; inativo e outro posto não contam', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $c = catalogoCb($br);
    $outraBomba = Bomba::factory()->create(['posto_id' => $br->id, 'nome' => 'BOMBA 02', 'ativo' => true]);
    bicoCb($br, $c, ['numero' => 7]);
    bicoCb($br, $c, ['numero' => 8, 'ativo' => false]);
    bicoCb($jorro, catalogoCb($jorro), ['numero' => 9]);
    $token = tokenDoGerente($br);
    $url = "/api/postos/{$br->id}/bicos";

    withToken($token)->postJson($url, corpoDeBicoCb($c, ['bomba_id' => $outraBomba->id]))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'numero_repetido');
    withToken($token)->postJson($url, corpoDeBicoCb($c, ['numero' => 8, 'bomba_id' => $outraBomba->id]))->assertCreated();
    withToken($token)->postJson($url, corpoDeBicoCb($c, ['numero' => 9]))->assertCreated();
});

it('o mesmo número na MESMA bomba, com o antigo inativo, é 422 numero_repetido (unique do banco), não 500', function (): void {
    ['posto' => $br] = postoDoPwa();
    $c = catalogoCb($br);
    bicoCb($br, $c, ['numero' => 7, 'ativo' => false]);

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/bicos", corpoDeBicoCb($c))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'numero_repetido');
});

it('edita número, bomba e tanque do bico; desativar é ativo = false e nada é apagado', function (): void {
    ['posto' => $br] = postoDoPwa();
    $c = catalogoCb($br);
    $outraBomba = Bomba::factory()->create(['posto_id' => $br->id, 'nome' => 'BOMBA 02', 'ativo' => true]);
    $segundoTanqueGc = Tanque::factory()->create(['posto_id' => $br->id, 'combustivel_id' => $c['gc']->id]);
    $bico = bicoCb($br, $c);
    leituraNoBicoCb($bico);
    $token = tokenDoGerente($br);
    $url = "/api/postos/{$br->id}/bicos/{$bico->id}";

    withToken($token)->putJson($url, corpoDeBicoCb($c, ['numero' => 12, 'bomba_id' => $outraBomba->id, 'tanque_id' => $segundoTanqueGc->id]))
        ->assertOk()->assertJsonPath('data.numero', 12)->assertJsonPath('data.bomba.id', $outraBomba->id);
    withToken($token)->putJson($url, corpoDeBicoCb($c, ['numero' => 12, 'bomba_id' => $outraBomba->id, 'tanque_id' => $segundoTanqueGc->id, 'ativo' => false]))
        ->assertOk()->assertJsonPath('data.ativo', false);

    expect(colunaDoBicoCb($bico, 'tanque_id'))->toBe($segundoTanqueGc->id)
        ->and(colunaDoBicoCb($bico, 'ativo'))->toBeFalse()
        ->and(DB::table('Leitura')->where('bico_id', $bico->id)->count())->toBe(1);
});

it('bico COM leitura não troca de combustível (422 combustivel_travado); SEM leitura troca', function (): void {
    ['posto' => $br] = postoDoPwa();
    $c = catalogoCb($br);
    $comLeitura = bicoCb($br, $c, ['numero' => 1]);
    $semLeitura = bicoCb($br, $c, ['numero' => 2]);
    leituraNoBicoCb($comLeitura);
    $token = tokenDoGerente($br);
    $paraEtanol = ['combustivel_id' => $c['et']->id, 'tanque_id' => $c['tanqueEt']->id];

    withToken($token)->putJson("/api/postos/{$br->id}/bicos/{$comLeitura->id}", corpoDeBicoCb($c, ['numero' => 1] + $paraEtanol))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'combustivel_travado');
    withToken($token)->putJson("/api/postos/{$br->id}/bicos/{$semLeitura->id}", corpoDeBicoCb($c, ['numero' => 2] + $paraEtanol))
        ->assertOk()->assertJsonPath('data.combustivel.id', $c['et']->id);

    expect(colunaDoBicoCb($comLeitura, 'combustivel_id'))->toBe($c['gc']->id);
});

it('ISOLAMENTO: bico e bomba do BR são 404 pela rota do Jorro, e nada muda', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $c = catalogoCb($br);
    $doJorro = catalogoCb($jorro);
    $bico = bicoCb($br, $c);
    $token = tokenDoGerente($jorro);

    withToken($token)->putJson("/api/postos/{$jorro->id}/bicos/{$bico->id}", corpoDeBicoCb($doJorro, ['numero' => 99]))->assertNotFound();
    withToken($token)->putJson("/api/postos/{$jorro->id}/bombas/{$c['bomba']->id}", ['nome' => 'X', 'ativo' => false])->assertNotFound();

    expect(colunaDoBicoCb($bico, 'numero'))->toBe(1)
        ->and(DB::table('Bomba')->where('id', $c['bomba']->id)->value('ativo'))->toBeTrue();
});

it('bomba com bico ativo não desativa (422 bomba_com_bicos_ativos); sem bico ativo desativa', function (): void {
    ['posto' => $br] = postoDoPwa();
    $c = catalogoCb($br);
    $bico = bicoCb($br, $c);
    $token = tokenDoGerente($br);
    $url = "/api/postos/{$br->id}/bombas/{$c['bomba']->id}";

    withToken($token)->putJson($url, ['nome' => 'BOMBA 01', 'ativo' => false])
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'bomba_com_bicos_ativos');
    DB::table('Bico')->where('id', $bico->id)->update(['ativo' => false]);
    withToken($token)->putJson($url, ['nome' => 'BOMBA 01', 'localizacao' => 'Fundo', 'ativo' => false])
        ->assertOk()->assertJsonPath('data.ativo', false)->assertJsonPath('data.localizacao', 'Fundo');
});

it('recusa de forma é 422 corpo_invalido', function (array $troca): void {
    ['posto' => $br] = postoDoPwa();
    $c = catalogoCb($br);

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/bicos", corpoDeBicoCb($c, $troca))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'corpo_invalido');
    expect(DB::table('Bico')->where('posto_id', $br->id)->count())->toBe(0);
})->with([
    'ativo em string' => [['ativo' => 'true']],
    'número zero' => [['numero' => 0]],
    'número decimal' => [['numero' => 1.5]],
    'sem tanque' => [['tanque_id' => null]],
]);
