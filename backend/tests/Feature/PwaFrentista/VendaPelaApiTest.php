<?php

declare(strict_types=1);

use App\Compartilhado\Posto;
use App\Estoque\Domain\Produto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\withToken;

require_once __DIR__.'/Cenario.php';

/*
|--------------------------------------------------------------------------
| Venda de produto pelo PWA, pela API (#101, fatia 2)
|--------------------------------------------------------------------------
| O que se prende aqui: o preço é o DO BANCO (o do cliente nem é aceito) e o total é exato; o limite
| de estoque que a tela aplica vale no servidor; o estoque NÃO é descontado (como hoje); o carrinho é
| tudo ou nada; o mesmo carrinho chegando duas vezes grava uma vez; o frentista é o do token; o
| produto de outro posto é recusado; e a lista "vendas de hoje" só traz as do próprio frentista.
*/

const CHAVE_VENDA = '7e3f1a2b-4c5d-4e6f-8a9b-0c1d2e3f4a5b';

/** @param  array<string, mixed>  $troca */
function produtoDoPwa(Posto $posto, array $troca = []): Produto
{
    return Produto::factory()->create(['posto_id' => $posto->id, ...$troca]);
}

/**
 * @param  list<array{0: Produto, 1: int}>  $itens
 * @return array<string, mixed>
 */
function carrinho(array $itens, string $chave = CHAVE_VENDA): array
{
    return [
        'chave' => $chave,
        'itens' => array_map(static fn (array $item): array => ['produto_id' => $item[0]->id, 'quantidade' => $item[1]], $itens),
    ];
}

it('lista os produtos ativos do posto, por nome, sem o custo', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $oleo = produtoDoPwa($posto, ['nome' => 'Óleo 20W50', 'preco_venda' => '39.90', 'estoque_atual' => 7]);
    produtoDoPwa($posto, ['nome' => 'Aditivo', 'ativo' => false]);
    ['posto' => $outro] = postoDoPwa();
    produtoDoPwa($outro, ['nome' => 'Arla do vizinho']);

    withToken(tokenDoFrentista($posto, $frentista))->getJson("/api/postos/{$posto->id}/produtos")
        ->assertOk()
        ->assertExactJson(['data' => [[
            'id' => $oleo->id, 'nome' => 'Óleo 20W50', 'preco_venda' => '39.90', 'estoque_atual' => 7,
            'categoria' => $oleo->categoria, 'unidade_medida' => 'unidade',
        ]]]);
});

it('grava o carrinho com o preço DO BANCO e o total exato; o estoque não é descontado', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $oleo = produtoDoPwa($posto, ['preco_venda' => '0.10', 'estoque_atual' => 5]);
    $filtro = produtoDoPwa($posto, ['preco_venda' => '19.99', 'estoque_atual' => 3]);

    // O cliente tenta impor preço, total e frentista: nada disso é aceito.
    $corpo = [
        'chave' => CHAVE_VENDA,
        'frentista_id' => 999999,
        'itens' => [
            ['produto_id' => $oleo->id, 'quantidade' => 3, 'valor_unitario' => 0.01, 'valor_total' => 0.03],
            ['produto_id' => $filtro->id, 'quantidade' => 2],
        ],
    ];

    withToken(tokenDoFrentista($posto, $frentista))->postJson("/api/postos/{$posto->id}/vendas", $corpo)
        ->assertCreated()
        ->assertJsonPath('data.repetido', false)
        ->assertJsonCount(2, 'data.vendas')
        ->assertJsonPath('data.vendas.0.valor_unitario', '0.10')
        ->assertJsonPath('data.vendas.0.valor_total', '0.30')
        ->assertJsonPath('data.vendas.1.valor_total', '39.98');

    $linhas = DB::table('VendaProduto')->where('chave_venda', CHAVE_VENDA)->orderBy('id')->get();
    expect($linhas)->toHaveCount(2)
        ->and((array) $linhas[0])->toMatchArray(['frentista_id' => $frentista->id, 'quantidade' => '3.00', 'valor_unitario' => '0.10', 'valor_total' => '0.30'])
        ->and((array) $linhas[1])->toMatchArray(['frentista_id' => $frentista->id, 'quantidade' => '2.00', 'valor_unitario' => '19.99', 'valor_total' => '39.98'])
        ->and(DB::table('Produto')->where('id', $oleo->id)->value('estoque_atual'))->toBe(5)
        ->and(DB::table('VendaProduto')->where('frentista_id', 999999)->exists())->toBeFalse();
});

it('idempotência: o mesmo carrinho duas vezes grava UMA vez; a mesma chave com outro carrinho é 409', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $oleo = produtoDoPwa($posto);
    $token = tokenDoFrentista($posto, $frentista);

    $primeira = withToken($token)->postJson("/api/postos/{$posto->id}/vendas", carrinho([[$oleo, 2]]))->assertCreated();
    withToken($token)->postJson("/api/postos/{$posto->id}/vendas", carrinho([[$oleo, 2]]))
        ->assertOk()
        ->assertJsonPath('data.repetido', true)
        ->assertJsonPath('data.vendas.0.id', $primeira->json('data.vendas.0.id'));
    withToken($token)->postJson("/api/postos/{$posto->id}/vendas", carrinho([[$oleo, 3]]))
        ->assertConflict()
        ->assertJsonPath('erro.codigo', 'chave_reutilizada');

    expect(DB::table('VendaProduto')->where('produto_id', $oleo->id)->count())->toBe(1);
});

it('a chave do carrinho de OUTRO frentista não devolve as linhas dele: 409', function (): void {
    ['posto' => $posto, 'frentista' => $a] = postoDoPwa();
    $b = frentistaDoPwa($posto);
    $oleo = produtoDoPwa($posto);
    withToken(tokenDoFrentista($posto, $a))->postJson("/api/postos/{$posto->id}/vendas", carrinho([[$oleo, 1]]))->assertCreated();

    withToken(tokenDoFrentista($posto, $b))->postJson("/api/postos/{$posto->id}/vendas", carrinho([[$oleo, 1]]))
        ->assertConflict()
        ->assertJsonPath('erro.codigo', 'chave_reutilizada');
});

it('limite de estoque e tudo ou nada: um item acima do estoque recusa o carrinho inteiro (422)', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $oleo = produtoDoPwa($posto, ['estoque_atual' => 5]);
    $filtro = produtoDoPwa($posto, ['estoque_atual' => 1, 'nome' => 'Filtro']);

    withToken(tokenDoFrentista($posto, $frentista))->postJson("/api/postos/{$posto->id}/vendas", carrinho([[$oleo, 5], [$filtro, 2]]))
        ->assertUnprocessable()
        ->assertJsonPath('erro.codigo', 'sem_estoque');

    expect(DB::table('VendaProduto')->where('chave_venda', CHAVE_VENDA)->exists())->toBeFalse();
});

it('isolamento: produto de OUTRO posto ou inativo é 422 produto_invalido e nada é gravado', function (bool $deOutroPosto): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    ['posto' => $br] = postoDoPwa();
    $produto = $deOutroPosto ? produtoDoPwa($br) : produtoDoPwa($posto, ['ativo' => false]);

    withToken(tokenDoFrentista($posto, $frentista))->postJson("/api/postos/{$posto->id}/vendas", carrinho([[$produto, 1]]))
        ->assertUnprocessable()
        ->assertJsonPath('erro.codigo', 'produto_invalido');

    expect(DB::table('VendaProduto')->where('produto_id', $produto->id)->exists())->toBeFalse();
})->with(['de outro posto' => [true], 'inativo' => [false]]);

it('corpo fora do contrato é 422 corpo_invalido', function (array $corpo): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $oleo = produtoDoPwa($posto);
    $corpo = json_decode(str_replace('"@produto"', (string) $oleo->id, (string) json_encode($corpo)), true);

    withToken(tokenDoFrentista($posto, $frentista))->postJson("/api/postos/{$posto->id}/vendas", is_array($corpo) ? $corpo : [])
        ->assertUnprocessable()
        ->assertJsonPath('erro.codigo', 'corpo_invalido');
})->with([
    'sem chave' => [['itens' => [['produto_id' => '@produto', 'quantidade' => 1]]]],
    'chave que não é uuid' => [['chave' => 'abc', 'itens' => [['produto_id' => '@produto', 'quantidade' => 1]]]],
    'carrinho vazio' => [['chave' => CHAVE_VENDA, 'itens' => []]],
    'quantidade zero' => [['chave' => CHAVE_VENDA, 'itens' => [['produto_id' => '@produto', 'quantidade' => 0]]]],
    'quantidade fracionada' => [['chave' => CHAVE_VENDA, 'itens' => [['produto_id' => '@produto', 'quantidade' => 1.5]]]],
    'produto repetido' => [['chave' => CHAVE_VENDA, 'itens' => [['produto_id' => '@produto', 'quantidade' => 1], ['produto_id' => '@produto', 'quantidade' => 1]]]],
]);

it('vendas de hoje: só as do frentista do token, de produto deste posto, na janela pedida', function (): void {
    ['posto' => $posto, 'frentista' => $a] = postoDoPwa();
    $b = frentistaDoPwa($posto);
    $oleo = produtoDoPwa($posto, ['nome' => 'Óleo']);
    $tokenA = tokenDoFrentista($posto, $a);
    withToken($tokenA)->postJson("/api/postos/{$posto->id}/vendas", carrinho([[$oleo, 2]]))->assertCreated();
    withToken(tokenDoFrentista($posto, $b))
        ->postJson("/api/postos/{$posto->id}/vendas", carrinho([[$oleo, 1]], '8f4a2b3c-5d6e-4f7a-9b0c-1d2e3f4a5b6c'))
        ->assertCreated();
    DB::table('VendaProduto')->insert([
        'frentista_id' => $a->id, 'produto_id' => $oleo->id, 'quantidade' => 1, 'valor_unitario' => '1.00',
        'valor_total' => '1.00', 'data' => now('UTC')->subDays(3),
    ]);

    $inicio = now('UTC')->subHours(12)->toIso8601ZuluString();
    $fim = now('UTC')->addHours(12)->toIso8601ZuluString();

    withToken($tokenA)->getJson("/api/postos/{$posto->id}/vendas?".http_build_query(['inicio' => $inicio, 'fim' => $fim]))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.quantidade', '2.00')
        ->assertJsonPath('data.0.valor_total', '39.80')
        ->assertJsonPath('data.0.produto', ['nome' => 'Óleo', 'categoria' => $oleo->categoria]);

    withToken($tokenA)->getJson("/api/postos/{$posto->id}/vendas?".http_build_query([
        'inicio' => $inicio, 'fim' => now('UTC')->addDays(5)->toIso8601ZuluString(),
    ]))->assertUnprocessable();
});

it('isolamento das rotas de venda: sem token 401, token de gerente 401, frentista de outro posto 403', function (string $metodo, string $caminho): void {
    exigeFrentistaDoPosto($metodo, $caminho, ['chave' => CHAVE_VENDA, 'itens' => [['produto_id' => 1, 'quantidade' => 1]]]);
})->with([
    'produtos' => ['GET', 'produtos'],
    'vendas de hoje' => ['GET', 'vendas?inicio=2026-01-07T03:00:00Z&fim=2026-01-08T03:00:00Z'],
    'registrar' => ['POST', 'vendas'],
]);
