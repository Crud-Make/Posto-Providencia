<?php

declare(strict_types=1);

use App\Compartilhado\Posto;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

use function Pest\Laravel\json;
use function Pest\Laravel\withToken;

require_once __DIR__.'/../PwaFrentista/Cenario.php';

/*
|--------------------------------------------------------------------------
| Despesas do painel pela API (#103, aba Receitas e Despesas do Fechamento de Caixa)
|--------------------------------------------------------------------------
| Porte de `despesaService.create` (Nova Despesa) e `despesaFixaService.lancar` (Despesas Fixas e
| Taxas de Cartão): o servidor grava `data` e `valor` EXATAMENTE como a tela manda — é a `data`
| que decide o mês do rateio do lucro (competência, mês civil; decisão do dono P9), e a regra
| "último dia do mês filtrado, ou hoje" continua na tela, sem mudar. O que muda: o posto é o da
| rota, o valor vai em string decimal (sem float), e o mesmo "Lançar" chegando duas vezes (chave
| de idempotência) não lança em dobro — a tabela não tinha unique nenhum.
*/

/**
 * Uma despesa do `$posto` já gravada (fora do escopo de qualquer PostoAtual).
 *
 * @param  array<string, mixed>  $atributos
 */
function despesaFn(Posto $posto, array $atributos = []): int
{
    return DB::table('Despesa')->insertGetId(array_merge([
        'descricao' => 'Energia', 'categoria' => 'Energia', 'valor' => '850.00', 'data' => '2026-09-30',
        'status' => 'pendente', 'recorrente' => true, 'posto_id' => $posto->id,
    ], $atributos));
}

/**
 * Uma coluna de cada linha de `data` da resposta.
 *
 * @param  TestResponse<Response>  $resposta
 * @return list<mixed>
 */
function colunaFn(TestResponse $resposta, string $coluna): array
{
    $linhas = $resposta->json('data');

    return is_array($linhas) ? array_values(array_map(static fn (mixed $l): mixed => is_array($l) ? ($l[$coluna] ?? null) : null, $linhas)) : [];
}

/**
 * @param  array<string, mixed>  $troca
 * @return array<string, mixed>
 */
function itemFn(array $troca = []): array
{
    return array_merge([
        'descricao' => 'Água', 'categoria' => 'Água', 'categoria_id' => null, 'valor' => '123.45', 'data' => '2026-09-30',
        'status' => 'pendente', 'recorrente' => true, 'data_pagamento' => null, 'observacoes' => null,
    ], $troca);
}

/**
 * @param  list<array<string, mixed>>  $itens
 * @return array<string, mixed>
 */
function loteFn(array $itens, ?string $chave = null): array
{
    return ['chave' => $chave ?? (string) Str::uuid(), 'despesas' => $itens];
}

it('sem token 401, gerente de OUTRO posto 403 — e nada é gravado', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $pedidos = [
        ['GET', "/api/postos/{$br->id}/despesas?inicio=2026-09-01&fim=2026-09-30", []],
        ['POST', "/api/postos/{$br->id}/despesas", loteFn([itemFn()])],
        ['GET', "/api/postos/{$br->id}/categorias-financeiras?tipo=despesa", []],
    ];

    foreach ($pedidos as [$metodo, $url, $corpo]) {
        json($metodo, $url, $corpo)->assertUnauthorized();
    }
    $doJorro = tokenDoGerente($jorro);
    foreach ($pedidos as [$metodo, $url, $corpo]) {
        withToken($doJorro)->json($metodo, $url, $corpo)->assertForbidden();
    }

    expect(DB::table('Despesa')->where('posto_id', $br->id)->count())->toBe(0);
});

it('lança um lote no posto da rota: data e valor gravados como vieram, em string decimal', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $outro] = postoDoPwa();

    $resposta = withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/despesas", loteFn([
        itemFn(['posto_id' => $outro->id]),
        itemFn(['descricao' => 'Taxas de cartão — Sipag', 'categoria' => 'Taxas Cartão', 'valor' => '1532.07']),
    ]));

    $resposta->assertCreated()
        ->assertJsonPath('data.repetido', false)
        ->assertJsonCount(2, 'data.despesas')
        ->assertJsonPath('data.despesas.0.valor', '123.45')
        ->assertJsonPath('data.despesas.0.data', '2026-09-30')
        ->assertJsonPath('data.despesas.1.categoria', 'Taxas Cartão');
    expect(DB::table('Despesa')->where('posto_id', $br->id)->orderBy('id')->pluck('valor')->all())->toBe(['123.45', '1532.07'])
        ->and(DB::table('Despesa')->where('posto_id', $outro->id)->count())->toBe(0);
});

it('IDEMPOTÊNCIA: o mesmo lançamento (mesma chave) chegando duas vezes grava UMA vez e devolve as mesmas linhas', function (): void {
    ['posto' => $br] = postoDoPwa();
    $token = tokenDoGerente($br);
    $lote = loteFn([itemFn(), itemFn(['descricao' => 'Internet', 'valor' => '99.90'])]);

    $primeira = withToken($token)->postJson("/api/postos/{$br->id}/despesas", $lote)->assertCreated();
    $segunda = withToken($token)->postJson("/api/postos/{$br->id}/despesas", $lote)->assertOk();

    $segunda->assertJsonPath('data.repetido', true);
    expect($segunda->json('data.despesas'))->toBe($primeira->json('data.despesas'))
        ->and(DB::table('Despesa')->where('posto_id', $br->id)->count())->toBe(2);
});

it('a mesma chave usada por OUTRO posto não devolve as despesas dele (a chave é por posto)', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $chave = (string) Str::uuid();
    withToken(tokenDoGerente($jorro))->postJson("/api/postos/{$jorro->id}/despesas", loteFn([itemFn(['descricao' => 'Do Jorro'])], $chave))->assertCreated();
    app('auth')->forgetGuards();

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/despesas", loteFn([itemFn()], $chave))
        ->assertStatus(409)->assertJsonPath('erro.codigo', 'chave_reutilizada');

    expect(DB::table('Despesa')->where('posto_id', $br->id)->count())->toBe(0);
});

it('lista as despesas do período (competência pela data), só do posto, com todas as colunas da tela', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    despesaFn($br, ['data' => '2026-08-31', 'descricao' => 'Agosto']);
    despesaFn($br, ['data' => '2026-09-01', 'descricao' => 'Início']);
    despesaFn($br, ['data' => '2026-09-30', 'descricao' => 'Fim', 'status' => 'pago', 'data_pagamento' => '2026-10-02', 'observacoes' => 'boleto']);
    despesaFn($jorro, ['data' => '2026-09-15', 'descricao' => 'Do Jorro']);

    $resposta = withToken(tokenDoGerente($br))->getJson("/api/postos/{$br->id}/despesas?inicio=2026-09-01&fim=2026-09-30")->assertOk();

    expect(colunaFn($resposta, 'descricao'))->toBe(['Início', 'Fim']);
    $resposta->assertJsonPath('data.1', [
        'id' => $resposta->json('data.1.id'), 'descricao' => 'Fim', 'categoria' => 'Energia', 'categoria_id' => null,
        'valor' => '850.00', 'data' => '2026-09-30', 'status' => 'pago', 'recorrente' => true,
        'data_pagamento' => '2026-10-02', 'observacoes' => 'boleto',
    ]);
});

it('lista as recorrentes do posto em qualquer data (base das Despesas Fixas pendentes)', function (): void {
    ['posto' => $br] = postoDoPwa();
    despesaFn($br, ['data' => '2026-03-31', 'descricao' => 'Aluguel']);
    despesaFn($br, ['data' => '2026-09-30', 'descricao' => 'Avulsa', 'recorrente' => false]);

    $resposta = withToken(tokenDoGerente($br))->getJson("/api/postos/{$br->id}/despesas?recorrentes=1")->assertOk();

    expect(colunaFn($resposta, 'descricao'))->toBe(['Aluguel']);
});

it('categorias de despesa: as do posto e as globais (posto NULL), nunca as de outro posto', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    DB::table('CategoriaFinanceira')->insert([
        ['nome' => 'Global Despesa', 'tipo' => 'despesa', 'posto_id' => null],
        ['nome' => 'Global Ambos', 'tipo' => 'ambos', 'posto_id' => null],
        ['nome' => 'Global Receita', 'tipo' => 'receita', 'posto_id' => null],
        ['nome' => 'Do BR', 'tipo' => 'despesa', 'posto_id' => $br->id],
        ['nome' => 'Do Jorro', 'tipo' => 'despesa', 'posto_id' => $jorro->id],
    ]);

    $nomes = colunaFn(withToken(tokenDoGerente($br))->getJson("/api/postos/{$br->id}/categorias-financeiras?tipo=despesa")->assertOk(), 'nome');

    expect($nomes)->toContain('Global Despesa', 'Global Ambos', 'Do BR')
        ->and(in_array('Global Receita', $nomes, true))->toBeFalse()
        ->and(in_array('Do Jorro', $nomes, true))->toBeFalse();
});

it('categoria de OUTRO posto na despesa é 422 categoria_invalida e nada é gravado', function (): void {
    ['posto' => $br] = postoDoPwa();
    ['posto' => $jorro] = postoDoPwa();
    $doJorro = DB::table('CategoriaFinanceira')->insertGetId(['nome' => 'Do Jorro', 'tipo' => 'despesa', 'posto_id' => $jorro->id]);
    $global = DB::table('CategoriaFinanceira')->insertGetId(['nome' => 'Global', 'tipo' => 'despesa', 'posto_id' => null]);
    $token = tokenDoGerente($br);

    withToken($token)->postJson("/api/postos/{$br->id}/despesas", loteFn([itemFn(['categoria_id' => $doJorro])]))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'categoria_invalida');
    withToken($token)->postJson("/api/postos/{$br->id}/despesas", loteFn([itemFn(['categoria_id' => $global])]))->assertCreated();

    expect(DB::table('Despesa')->where('posto_id', $br->id)->pluck('categoria_id')->all())->toBe([$global]);
});

it('recusa de forma é 422 corpo_invalido e nada é gravado', function (array $corpo): void {
    ['posto' => $br] = postoDoPwa();

    withToken(tokenDoGerente($br))->postJson("/api/postos/{$br->id}/despesas", $corpo)
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'corpo_invalido');
    expect(DB::table('Despesa')->where('posto_id', $br->id)->count())->toBe(0);
})->with([
    'sem chave' => [['despesas' => [itemFn()]]],
    'chave que não é uuid' => [loteFn([itemFn()], 'abc')],
    'lote vazio' => [loteFn([])],
    'valor em número (float)' => [loteFn([itemFn(['valor' => 123.45])])],
    'valor zero' => [loteFn([itemFn(['valor' => '0'])])],
    'valor com 3 casas' => [loteFn([itemFn(['valor' => '1.234'])])],
    'data fora de AAAA-MM-DD' => [loteFn([itemFn(['data' => '30/09/2026'])])],
    'status desconhecido' => [loteFn([itemFn(['status' => 'atrasado'])])],
    'descrição vazia' => [loteFn([itemFn(['descricao' => ''])])],
    'recorrente em string' => [loteFn([itemFn(['recorrente' => 'true'])])],
]);

it('o GET exige período completo ou recorrentes', function (string $consulta): void {
    ['posto' => $br] = postoDoPwa();

    withToken(tokenDoGerente($br))->getJson("/api/postos/{$br->id}/despesas{$consulta}")
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'corpo_invalido');
})->with(['', '?inicio=2026-09-01', '?inicio=2026-09-30&fim=2026-09-01']);
