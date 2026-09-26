<?php

declare(strict_types=1);

namespace App\Compras\Domain;

/**
 * `Compra.custo_por_litro` = `valor_total ÷ quantidade_litros`, na escala da coluna
 * (`numeric(10,4)`) — o porte de `compraService.create` (`compra.service.ts`), que dividia no
 * cliente e deixava o Postgres arredondar na gravação. Aqui a divisão é decimal exata (bcmath) e o
 * arredondamento é o do Postgres ao gravar numeric: metade para longe do zero, na 4ª casa.
 *
 * Nenhuma fórmula nova: é a mesma divisão, sem o float no meio.
 */
final class CustoPorLitro
{
    /** Teto de `numeric(10,4)`: 6 dígitos inteiros. Acima disso o Postgres recusa a gravação. */
    public const string TETO = '999999.9999';

    /**
     * @param  numeric-string  $valorTotal
     * @param  numeric-string  $litros  maior que zero (o FormRequest garante)
     * @return numeric-string
     */
    public static function de(string $valorTotal, string $litros): string
    {
        // Truncar na 10ª casa não cruza a fronteira de meio da 4ª: a fronteira tem 5 casas.
        $bruto = bcdiv($valorTotal, $litros, 10);

        return bcadd($bruto, '0.00005', 4);
    }

    /** @param  numeric-string  $custo */
    public static function cabeNaColuna(string $custo): bool
    {
        return bccomp($custo, self::TETO, 4) <= 0;
    }
}
