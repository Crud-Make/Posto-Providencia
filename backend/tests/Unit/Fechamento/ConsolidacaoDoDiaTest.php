<?php

declare(strict_types=1);

use App\Fechamento\Domain\ConsolidacaoDoDia;

/*
|--------------------------------------------------------------------------
| Caracterização do porte de `consolidarFechamento` (#101)
|--------------------------------------------------------------------------
| Os valores esperados NÃO foram feitos à mão: saíram da função TypeScript canônica, rodada com
| bun sobre as mesmas entradas (em 24/09/2026):
|
|   totaisDoDia(4321.09 + 2718.28 + 1414.21 + 1732.05, meiosFromFechamentoRow(S1..S3))
|     → { totalVendas: 10185.63, totalRecebido: 10948.19, diferenca: -762.56 }
|   totaisDoDia(10185.63, [S1]) → { totalRecebido: 3688.65, diferenca: 6496.98 }
|
| S2 traz 0.10 + 0.20 (o clássico do float) e baldes NULL; S3, centavo solto (0.01).
*/

/** @return list<array<string, ?string>> */
function sessoesDeCaracterizacao(): array
{
    return [
        ['valor_dinheiro' => '1234.56', 'valor_moedas' => '12.30', 'valor_pix' => '845.10', 'valor_cartao' => '0.00',
            'valor_cartao_debito' => '410.25', 'valor_cartao_credito' => '998.99', 'valor_nota' => '150.00', 'baratao' => '37.45'],
        ['valor_dinheiro' => '0.10', 'valor_moedas' => '0.20', 'valor_pix' => '1718.35', 'valor_cartao' => '250.00',
            'valor_cartao_debito' => null, 'valor_cartao_credito' => null, 'valor_nota' => '0.00', 'baratao' => null],
        ['valor_dinheiro' => '2999.99', 'valor_moedas' => '0.01', 'valor_pix' => '0.00', 'valor_cartao' => '0.00',
            'valor_cartao_debito' => '1500.50', 'valor_cartao_credito' => '700.49', 'valor_nota' => '89.90', 'baratao' => '0.00'],
    ];
}

const LEITURAS_CARACTERIZACAO = ['4321.09', '2718.28', '1414.21', '1732.05'];

it('encerrante completo: os três números do TypeScript, exatos', function (): void {
    $c = ConsolidacaoDoDia::de(sessoesDeCaracterizacao(), LEITURAS_CARACTERIZACAO, 4);

    expect([$c->apurado, $c->totalVendas, $c->totalRecebido, $c->diferenca])
        ->toBe([true, '10185.63', '10948.19', '-762.56']);
});

it('uma sessão só: falta de 6496.98 (positivo = FALTA)', function (): void {
    $c = ConsolidacaoDoDia::de([sessoesDeCaracterizacao()[0]], LEITURAS_CARACTERIZACAO, 4);

    expect([$c->totalVendas, $c->totalRecebido, $c->diferenca])->toBe(['10185.63', '3688.65', '6496.98']);
});

it('ausência de leitura não é venda zero: sem leitura, venda e diferença ficam null', function (): void {
    $c = ConsolidacaoDoDia::de(sessoesDeCaracterizacao(), [], 4);

    expect([$c->apurado, $c->totalVendas, $c->totalRecebido, $c->diferenca])->toBe([false, null, '10948.19', null]);
});

it('encerrante pela metade (3 de 4 bicos) também não é venda: null', function (): void {
    $c = ConsolidacaoDoDia::de(sessoesDeCaracterizacao(), array_slice(LEITURAS_CARACTERIZACAO, 0, 3), 4);

    expect([$c->apurado, $c->totalVendas, $c->diferenca])->toBe([false, null, null]);
});

it('mais leituras que bicos ativos (bico desativado com leitura) conta como apurado, como no TypeScript', function (): void {
    $c = ConsolidacaoDoDia::de(sessoesDeCaracterizacao(), LEITURAS_CARACTERIZACAO, 3);

    expect([$c->apurado, $c->totalVendas])->toBe([true, '10185.63']);
});

it('dia sem sessão: recebido 0.00', function (): void {
    $c = ConsolidacaoDoDia::de([], LEITURAS_CARACTERIZACAO, 4);

    expect([$c->totalRecebido, $c->diferenca])->toBe(['0.00', '10185.63']);
});
