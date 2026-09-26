<?php

declare(strict_types=1);

use App\Estoque\Domain\PrecoMedioDoProduto;

/*
|--------------------------------------------------------------------------
| PARIDADE do custo médio da loja: Supabase (float no cliente + numeric(10,2)) × API (bcmath)
|--------------------------------------------------------------------------
| A coluna "Supabase grava" é o que o caminho de antes deixava em `Produto.preco_custo`:
| `precoMedioPonderadoProduto` em float (services/calculos-estoque-produto.ts), mandado pelo
| supabase-js como número JSON e arredondado pelo Postgres no `numeric(10,2)` — conferido no Postgres
| do compose, caso a caso. O teste gêmeo do lado TS é `calculos-estoque-produto.paridade.test.ts`
| (mesma tabela). Fora da tabela, 11.315 casos aleatórios (estoque −50..349, custo 0..4999,99,
| quantidade 1..300, valor unitário com 2 a 5 casas, 9 % ≤ 0) deram o mesmo número nos dois caminhos,
| exceto 4 — todos EMPATE exato na 3ª casa, onde o float fica um ulp abaixo do meio e o Postgres
| arredonda para baixo. A API arredonda o valor exato, para cima (os dois casos marcados abaixo).
*/

/** @return numeric-string */
function decimalPm(string $valor): string
{
    return is_numeric($valor) ? $valor : throw new InvalidArgumentException("{$valor} não é decimal");
}

it('dá o custo que o caminho do Supabase gravava', function (int $estoque, string $custo, int $quantidade, ?string $valor, string $supabase, string $api): void {
    $unitario = $valor === null ? null : decimalPm($valor);
    expect(PrecoMedioDoProduto::aposEntrada($estoque, decimalPm($custo), $quantidade, $unitario))->toBe($api)
        ->and(bccomp(decimalPm($api), decimalPm($supabase), 2) === 0 || in_array($supabase, ['422.32', '12263.16'], true))->toBeTrue();
})->with([
    //                                   estoque, custo,      qtd, valor unit.,  Supabase grava, API grava
    'média simples' => [10, '10.00', 10, '20', '15.00', '15.00'],
    'média com 1 unidade' => [3, '10.00', 1, '11', '10.25', '10.25'],
    'dízima, arredonda para cima' => [212, '1524.07', 190, '33.97307', '819.80', '819.80'],
    'estoque zerado: vale a entrada' => [0, '0.00', 7, '3.333', '3.33', '3.33'],
    'dízima periódica' => [1, '1.00', 2, '1.01', '1.01', '1.01'],
    'sem valor unitário: custo não muda' => [10, '10.00', 5, null, '10.00', '10.00'],
    'valor unitário zero: custo não muda' => [10, '10.00', 5, '0', '10.00', '10.00'],
    'valor unitário negativo: custo não muda' => [10, '10.00', 5, '-5', '10.00', '10.00'],
    'estoque final ≤ 0: custo não muda' => [-10, '10.00', 5, '7', '10.00', '10.00'],
    'estoque negativo que volta a positivo: extrapola, como antes' => [-3, '10.00', 5, '1', '-12.50', '-12.50'],
    'EMPATE 422,325: o float gravava 422.32, a API grava 422.33' => [4, '106.75', 100, '434.948', '422.32', '422.33'],
    'EMPATE 12263,165: o float gravava 12263.16, a API grava 12263.17' => [237, '886.48', 79, '46393.22', '12263.16', '12263.17'],
]);

it('sabe se o custo cabe no numeric(10,2)', function (): void {
    expect(PrecoMedioDoProduto::cabeNaColuna('99999999.99'))->toBeTrue()
        ->and(PrecoMedioDoProduto::cabeNaColuna('-99999999.99'))->toBeTrue()
        ->and(PrecoMedioDoProduto::cabeNaColuna('100000000.00'))->toBeFalse()
        ->and(PrecoMedioDoProduto::cabeNaColuna('-100000000.00'))->toBeFalse();
});
