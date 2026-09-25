<?php

declare(strict_types=1);

namespace App\Compras\Application;

use App\Compras\Domain\Compra;
use App\Compras\Domain\CustoPorLitro;
use Illuminate\Support\Facades\DB;

/**
 * Lança UMA compra e soma os litros no estoque — os efeitos de `registrarCompra` do painel
 * (`usePersistenciaRegistro.ts`), que no Supabase eram três idas ao banco:
 *
 * 1. `Compra`: a linha, com `custo_por_litro` = valor ÷ litros ({@see CustoPorLitro}) e a mesma
 *    observação que o painel gravava. `Estoque.custo_medio` **não** é tocado — o painel deixou de
 *    carimbá-lo em 03/09/2026 (a coluna segue congelada);
 * 2. `Estoque.quantidade_atual += litros` e `ultima_atualizacao = agora`, na linha do combustível
 *    (`compra.service.ts`). Sem linha de Estoque, nada — como hoje;
 * 3. `Tanque.estoque_atual += litros`, no tanque do item (`tanqueService.updateStock`).
 *
 * As somas são feitas no próprio `UPDATE` (atômicas) com os litros como vieram, e o Postgres
 * arredonda na escala da coluna — o mesmo arredondamento que a soma em float do painel sofria ao
 * ser gravada. Os litros da `Compra` também: `numeric(15,2)` arredonda o que chegou.
 */
final readonly class LancaCompra
{
    public const string OBSERVACAO = 'Atualização de estoque via Painel';

    public function __invoke(RegistroDeclarado $registro, ItemDoRegistro $item): void
    {
        if ($item->litros === null || $item->valorTotal === null) {
            return;
        }

        Compra::query()->create([
            'data' => $registro->dia->utc()->startOfDay(),
            'combustivel_id' => $item->combustivelId,
            'fornecedor_id' => $registro->fornecedorId,
            'quantidade_litros' => $item->litros,
            'valor_total' => $item->valorTotal,
            'custo_por_litro' => CustoPorLitro::de($item->valorTotal, $item->litros),
            'observacoes' => self::OBSERVACAO,
            'chave_compra' => $registro->chave,
        ]);

        DB::update(
            'UPDATE "Estoque" SET quantidade_atual = quantidade_atual + ?::numeric, ultima_atualizacao = now() WHERE combustivel_id = ?',
            [$item->litros, $item->combustivelId],
        );

        if ($item->tanqueId !== null) {
            DB::update('UPDATE "Tanque" SET estoque_atual = estoque_atual + ?::numeric WHERE id = ?', [$item->litros, $item->tanqueId]);
        }
    }
}
