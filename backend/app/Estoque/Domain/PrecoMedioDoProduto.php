<?php

declare(strict_types=1);

namespace App\Estoque\Domain;

/**
 * O novo `Produto.preco_custo` depois de uma ENTRADA de mercadoria — o porte, SEM mudar a conta, de
 * `precoMedioPonderadoProduto` (`frontend/apps/web/src/services/calculos-estoque-produto.ts`), que o
 * painel fazia no cliente em float e deixava o Postgres arredondar ao gravar no `numeric(10,2)`.
 *
 * Média ponderada móvel da loja (não é a dos combustíveis — ver o cabeçalho do módulo TS):
 *
 *     novo custo = (estoque × custo atual + quantidade × valor unitário) ÷ (estoque + quantidade)
 *
 * Bordas preservadas do original:
 * - valor unitário ausente ou ≤ 0 → o custo NÃO muda;
 * - estoque final ≤ 0 → o custo NÃO muda.
 *
 * Aqui a conta é decimal exata (bcmath) e o arredondamento é o do Postgres ao gravar numeric: metade
 * para longe do zero, na 2ª casa. O float do cliente só diferia disto no ruído da 17ª casa — a
 * paridade está provada caso a caso em `PrecoMedioDoProdutoTest` e no teste gêmeo do TS.
 */
final class PrecoMedioDoProduto
{
    /** Teto de `numeric(10,2)`. Acima disso o Postgres recusa a gravação. */
    public const string TETO = '99999999.99';

    /** Casas da conta intermediária: o valor unitário chega com até 20. */
    private const int ESCALA = 24;

    /**
     * @param  numeric-string  $custoAtual  `Produto.preco_custo` como está gravado
     * @param  numeric-string|null  $valorUnitario  R$/un da entrada
     * @return numeric-string o custo na escala da coluna (2 casas)
     */
    public static function aposEntrada(int $estoqueAtual, string $custoAtual, int $quantidade, ?string $valorUnitario): string
    {
        $estoqueFinal = $estoqueAtual + $quantidade;
        if ($valorUnitario === null || bccomp($valorUnitario, '0', self::ESCALA) <= 0 || $estoqueFinal <= 0) {
            return self::naColuna($custoAtual);
        }

        $totalAtual = bcmul((string) $estoqueAtual, $custoAtual, self::ESCALA);
        $totalEntrada = bcmul((string) $quantidade, $valorUnitario, self::ESCALA);

        return self::naColuna(bcdiv(bcadd($totalAtual, $totalEntrada, self::ESCALA), (string) $estoqueFinal, self::ESCALA));
    }

    /** @param  numeric-string  $custo */
    public static function cabeNaColuna(string $custo): bool
    {
        return bccomp(ltrim($custo, '-'), self::TETO, 2) <= 0;
    }

    /**
     * Metade para longe do zero, na 2ª casa — o que o Postgres faz ao gravar `numeric(10,2)`. Truncar
     * na 24ª casa antes não cruza a fronteira de meio, que tem 3 casas.
     *
     * @param  numeric-string  $valor
     * @return numeric-string
     */
    private static function naColuna(string $valor): string
    {
        return bccomp($valor, '0', self::ESCALA) < 0 ? bcsub($valor, '0.005', 2) : bcadd($valor, '0.005', 2);
    }
}
