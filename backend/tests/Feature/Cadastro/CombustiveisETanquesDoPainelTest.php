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
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

use function Pest\Laravel\json;
use function Pest\Laravel\withToken;

require_once __DIR__.'/../PwaFrentista/Cenario.php';

/*
|--------------------------------------------------------------------------
| Cadastro de combustíveis e tanques pelo painel (#157, fatia 2 da #153)
|--------------------------------------------------------------------------
| Decisões do dono (27/09): o combustível tem PREÇO DE VENDA (ponto de partida do dia na aba
| Leituras; o dia salvo carimba `preco_litro` na Leitura) e não tem preço de custo (custo vem da
| compra do mês). O tanque NÃO tem estoque inicial: nasce com 0 e o de partida é a primeira régua;
| editar nunca toca `estoque_atual`. Nada se apaga. O posto é o da rota.
*/

/** Combustível do `$posto` (fora do escopo de qualquer PostoAtual). */
function combustivelCt(Posto $posto, string $codigo = 'GC', bool $ativo = true): Combustivel
{
    return Combustivel::factory()->create(['posto_id' => $posto->id, 'codigo' => $codigo, 'nome' => "Comb {$codigo}", 'ativo' => $ativo, 'preco_venda' => 6.5]);
}

/** Tanque do `$posto` para o `$combustivel`. */
function tanqueCt(Posto $posto, Combustivel $combustivel, float $estoque = 0): Tanque
{
    return Tanque::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $combustivel->id, 'estoque_atual' => $estoque]);
}

/** Bico do `$posto` ligado ao tanque. */
function bicoCt(Posto $posto, Tanque $tanque, bool $ativo = true): Bico
{
    $bomba = Bomba::factory()->create(['posto_id' => $posto->id, 'ativo' => true]);

    return Bico::factory()->create([
        'posto_id' => $posto->id, 'numero' => 1, 'bomba_id' => $bomba->id,
        'combustivel_id' => $tanque->combustivel_id, 'tanque_id' => $tanque->id, 'ativo' => $ativo,
    ]);
}

/** Uma leitura lançada num bico do combustível — é o que trava o código dele. */
function leituraCt(Posto $posto, Combustivel $combustivel): void
{
    $bico = bicoCt($posto, tanqueCt($posto, $combustivel), false);
    DB::table('Leitura')->insert([
        'data' => '2026-09-20 00:00:00+00', 'bico_id' => $bico->id, 'combustivel_id' => $combustivel->id,
        'leitura_inicial' => 100, 'leitura_final' => 150, 'litros_vendidos' => 50, 'preco_litro' => 6.5,
        'valor_total' => 325, 'usuario_id' => Usuario::factory()->create()->id, 'posto_id' => $posto->id,
    ]);
}

/** Uma medição de régua do tanque — trava o combustível dele. */
function reguaCt(Tanque $tanque): void
{
    DB::table('HistoricoTanque')->insert(['tanque_id' => $tanque->id, 'data' => '2026-09-20', 'volume_fisico' => 5000]);
}

/**
 * @param  array<string, mixed>  $troca
 * @return array<string, mixed>
 */
function corpoDeCombustivelCt(array $troca = []): array
{
    return array_merge(['nome' => 'Gasolina Comum', 'codigo' => 'GC', 'cor' => '#E53935', 'preco_venda' => '6.89', 'ativo' => true], $troca);
}

/**
 * @param  array<string, mixed>  $troca
 * @return array<string, mixed>
 */
function corpoDeTanqueCt(Combustivel $combustivel, array $troca = []): array
{
    return array_merge(['nome' => 'Tanque GC', 'combustivel_id' => $combustivel->id, 'capacidade' => '20000', 'ativo' => true], $troca);
}

function colunaCt(string $tabela, int $id, string $coluna): mixed
{
    return DB::table($tabela)->where('id', $id)->value($coluna);
}

/** A coluna como texto (decimal do Postgres chega em string). */
function textoCt(string $tabela, int $id, string $coluna): string
{
    $valor = colunaCt($tabela, $id, $coluna);

    return is_scalar($valor) ? (string) $valor : '';
}

/** A coluna numérica como float, para comparar litros. */
function numeroCt(string $tabela, int $id, string $coluna): float
{
    $valor = colunaCt($tabela, $id, $coluna);

    return is_numeric($valor) ? (float) $valor : NAN;
}

/**
 * O `data.id` de uma resposta de criação.
 *
 * @param  TestResponse<Response>  $resposta
 */
function idCt(TestResponse $resposta): int
{
    $id = $resposta->json('data.id');

    return is_int($id) ? $id : 0;
}

it('sem token 401, operador 403 e gerente de OUTRO posto 403 — e nada muda', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $gc = combustivelCt($br);
    $tanque = tanqueCt($br, $gc);
    $pedidos = [
        ['POST', "/api/postos/{$br->id}/combustiveis", corpoDeCombustivelCt(['codigo' => 'ET'])],
        ['PUT', "/api/postos/{$br->id}/combustiveis/{$gc->id}", corpoDeCombustivelCt(['preco_venda' => '1.00'])],
        ['POST', "/api/postos/{$br->id}/tanques", corpoDeTanqueCt($gc)],
        ['PUT', "/api/postos/{$br->id}/tanques/{$tanque->id}", corpoDeTanqueCt($gc, ['nome' => 'Invasor'])],
    ];

    foreach ($pedidos as [$metodo, $url, $corpo]) {
        json($metodo, $url, $corpo)->assertUnauthorized();
    }
    $doJorro = tokenDoGerente($jorro);
    foreach ($pedidos as [$metodo, $url, $corpo]) {
        withToken($doJorro)->json($metodo, $url, $corpo)->assertForbidden();
    }

    expect(DB::table('Combustivel')->where('posto_id', $br->id)->count())->toBe(1)
        ->and(textoCt('Combustivel', $gc->id, 'preco_venda'))->toBe('6.50')
        ->and(colunaCt('Tanque', $tanque->id, 'nome'))->toBe($tanque->nome);
});

it('operador do posto: 403 — cadastro é de quem GERE', function (): void {
    ['posto' => $br] = postoDoPwa();
    $gc = combustivelCt($br);
    $email = 'op.ct.'.bin2hex(random_bytes(3)).'@teste.com';
    $operador = Usuario::factory()->create(['email' => $email, 'role' => Role::Operador, 'senha' => 'senha-do-operador-1']);
    UsuarioPosto::factory()->create(['usuario_id' => $operador->id, 'posto_id' => $br->id, 'role' => PapelNoPosto::Operador]);
    $token = Pest\Laravel\postJson('/api/login', ['email' => $email, 'senha' => 'senha-do-operador-1'])->json('token');

    withToken(is_string($token) ? $token : '')->putJson("/api/postos/{$br->id}/combustiveis/{$gc->id}", corpoDeCombustivelCt())->assertForbidden();
});

it('cria combustível com preço de venda no posto da rota; código sai em maiúsculas; sem preço de custo', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $outro] = postoDoPwa();

    $resposta = withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/combustiveis", corpoDeCombustivelCt([
        'codigo' => ' s10 ', 'nome' => ' Diesel S10 ', 'preco_venda' => '7.29', 'posto_id' => $outro->id, 'preco_custo' => '5.00',
    ]));

    $resposta->assertCreated()
        ->assertJsonPath('data.codigo', 'S10')
        ->assertJsonPath('data.nome', 'Diesel S10')
        ->assertJsonPath('data.preco_venda', '7.29');
    $id = idCt($resposta);
    expect(colunaCt('Combustivel', $id, 'posto_id'))->toBe($br->id)
        ->and(numeroCt('Combustivel', $id, 'preco_custo'))->toBe(0.0);
});

it('código repetido no posto (inclusive inativo) é 422 codigo_repetido; o mesmo código em outro posto passa', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    combustivelCt($br, 'GC', false);

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/combustiveis", corpoDeCombustivelCt())
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'codigo_repetido');
    app('auth')->forgetGuards();
    withToken(tokenDoGerente($jorro))->postJson("/api/postos/{$jorro->id}/combustiveis", corpoDeCombustivelCt())->assertCreated();
});

it('editar o preço de venda muda o cadastro e NÃO toca na leitura já salva', function (): void {
    ['posto' => $br] = postoDoPwa();
    $gc = combustivelCt($br);
    leituraCt($br, $gc);

    withToken(tokenDoGerente($br))->putJson("/api/postos/{$br->id}/combustiveis/{$gc->id}", corpoDeCombustivelCt(['preco_venda' => '6.99']))
        ->assertOk()->assertJsonPath('data.preco_venda', '6.99');

    expect(DB::table('Leitura')->where('combustivel_id', $gc->id)->value('preco_litro'))->toBe('6.50');
});

it('combustível com leitura ou compra não muda de código (422 codigo_travado); sem nada, muda', function (string $historico): void {
    ['posto' => $br] = postoDoPwa();
    $gc = combustivelCt($br);
    $livre = combustivelCt($br, 'XX');
    if ($historico === 'leitura') {
        leituraCt($br, $gc);
    } else {
        DB::table('Compra')->insert([
            'data' => '2026-09-20 00:00:00+00', 'combustivel_id' => $gc->id, 'fornecedor_id' => DB::table('Fornecedor')->insertGetId(['nome' => 'Distribuidora', 'cnpj' => (string) random_int(10_000_000, 99_999_999), 'posto_id' => $br->id]),
            'quantidade_litros' => 1000, 'valor_total' => 5000, 'custo_por_litro' => 5, 'posto_id' => $br->id,
        ]);
    }
    $token = tokenDoGerente($br);

    withToken($token)->putJson("/api/postos/{$br->id}/combustiveis/{$gc->id}", corpoDeCombustivelCt(['codigo' => 'GX']))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'codigo_travado');
    withToken($token)->putJson("/api/postos/{$br->id}/combustiveis/{$livre->id}", corpoDeCombustivelCt(['codigo' => 'ET']))
        ->assertOk()->assertJsonPath('data.codigo', 'ET');

    expect(colunaCt('Combustivel', $gc->id, 'codigo'))->toBe('GC');
})->with(['leitura', 'compra']);

it('combustível com bico ativo não desativa (422 combustivel_com_bicos_ativos)', function (): void {
    ['posto' => $br] = postoDoPwa();
    $gc = combustivelCt($br);
    $bico = bicoCt($br, tanqueCt($br, $gc));
    $token = tokenDoGerente($br);
    $url = "/api/postos/{$br->id}/combustiveis/{$gc->id}";

    withToken($token)->putJson($url, corpoDeCombustivelCt(['ativo' => false]))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'combustivel_com_bicos_ativos');
    DB::table('Bico')->where('id', $bico->id)->update(['ativo' => false]);
    withToken($token)->putJson($url, corpoDeCombustivelCt(['ativo' => false]))->assertOk()->assertJsonPath('data.ativo', false);
});

it('cria tanque SEM estoque inicial (nasce 0, estoque_atual do corpo é ignorado)', function (): void {
    ['posto' => $br] = postoDoPwa();
    $gc = combustivelCt($br);

    $resposta = withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/tanques", corpoDeTanqueCt($gc, ['estoque_atual' => '9000']));

    $resposta->assertCreated()
        ->assertJsonPath('data.nome', 'Tanque GC')
        ->assertJsonPath('data.combustivel_id', $gc->id)
        ->assertJsonPath('data.capacidade', '20000.00');
    expect(numeroCt('Tanque', idCt($resposta), 'estoque_atual'))->toBe(0.0);
});

it('editar o tanque nunca mexe no estoque', function (): void {
    ['posto' => $br] = postoDoPwa();
    $gc = combustivelCt($br);
    $tanque = tanqueCt($br, $gc, 3210.5);

    withToken(tokenDoGerente($br))->putJson("/api/postos/{$br->id}/tanques/{$tanque->id}", corpoDeTanqueCt($gc, ['nome' => 'Tanque 1', 'capacidade' => '15000', 'estoque_atual' => '0']))
        ->assertOk()->assertJsonPath('data.nome', 'Tanque 1');

    expect(numeroCt('Tanque', $tanque->id, 'estoque_atual'))->toBe(3210.5);
});

it('ISOLAMENTO: combustível de OUTRO posto no tanque é 422 combustivel_invalido; tanque e combustível do BR são 404 pela rota do Jorro', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $doBr = combustivelCt($br);
    $tanqueDoBr = tanqueCt($br, $doBr);
    $doJorro = combustivelCt($jorro);
    $token = tokenDoGerente($jorro);

    withToken($token)->postJson("/api/postos/{$jorro->id}/tanques", corpoDeTanqueCt($doBr))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'combustivel_invalido');
    withToken($token)->putJson("/api/postos/{$jorro->id}/tanques/{$tanqueDoBr->id}", corpoDeTanqueCt($doJorro))->assertNotFound();
    withToken($token)->putJson("/api/postos/{$jorro->id}/combustiveis/{$doBr->id}", corpoDeCombustivelCt())->assertNotFound();

    expect(DB::table('Tanque')->where('posto_id', $jorro->id)->count())->toBe(0)
        ->and(colunaCt('Tanque', $tanqueDoBr->id, 'combustivel_id'))->toBe($doBr->id);
});

it('tanque com bico ou régua não troca de combustível (422 combustivel_travado); sem nada, troca', function (string $vinculo): void {
    ['posto' => $br] = postoDoPwa();
    $gc = combustivelCt($br);
    $et = combustivelCt($br, 'ET');
    $preso = tanqueCt($br, $gc);
    $livre = tanqueCt($br, $gc);
    $vinculo === 'bico' ? bicoCt($br, $preso, false) : reguaCt($preso);
    $token = tokenDoGerente($br);

    withToken($token)->putJson("/api/postos/{$br->id}/tanques/{$preso->id}", corpoDeTanqueCt($et))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'combustivel_travado');
    withToken($token)->putJson("/api/postos/{$br->id}/tanques/{$livre->id}", corpoDeTanqueCt($et))
        ->assertOk()->assertJsonPath('data.combustivel_id', $et->id);
})->with(['bico', 'regua']);

it('tanque com bico ativo não desativa (422 tanque_com_bicos_ativos)', function (): void {
    ['posto' => $br] = postoDoPwa();
    $gc = combustivelCt($br);
    $tanque = tanqueCt($br, $gc);
    bicoCt($br, $tanque);

    withToken(tokenDoGerente($br))->putJson("/api/postos/{$br->id}/tanques/{$tanque->id}", corpoDeTanqueCt($gc, ['ativo' => false]))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'tanque_com_bicos_ativos');
});

it('recusa de forma é 422 corpo_invalido', function (string $rota, array $troca): void {
    ['posto' => $br] = postoDoPwa();
    $gc = combustivelCt($br);
    $corpo = $rota === 'combustiveis' ? corpoDeCombustivelCt($troca + ['codigo' => 'NV']) : corpoDeTanqueCt($gc, $troca);

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/{$rota}", $corpo)
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'corpo_invalido');
})->with([
    'preço zero' => ['combustiveis', ['preco_venda' => '0']],
    'preço com 3 casas' => ['combustiveis', ['preco_venda' => '6.899']],
    'preço em número' => ['combustiveis', ['preco_venda' => 6.89]],
    'cor fora de #RRGGBB' => ['combustiveis', ['cor' => 'vermelho']],
    'código vazio' => ['combustiveis', ['codigo' => '']],
    'capacidade zero' => ['tanques', ['capacidade' => '0']],
    'ativo em string' => ['tanques', ['ativo' => 'true']],
]);
