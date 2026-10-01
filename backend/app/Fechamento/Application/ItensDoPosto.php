<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\RecusaDaGravacao;
use Illuminate\Support\Facades\DB;

/**
 * Todo id que o corpo do dia traz — bico, combustível, frentista, forma de pagamento — tem de ser do
 * posto da ROTA.
 *
 * Achado de 30/09/2026 (sonda ao desenhar a rota de leituras do PWA do dono): o `PUT /fechamento` do
 * gerente do BR com o `bico_id` de um bico do Jorro respondia 200 e SOBRESCREVIA a leitura do Jorro —
 * o UPSERT é por `(bico_id, data)` e não troca o `posto_id`. A tela nunca manda id de outro posto, mas
 * uma requisição montada à mão mexia no dinheiro do vizinho. O global scope do tenant não protege aqui:
 * a escrita é por UPSERT no query builder, e as tabelas de cadastro são de outro módulo (lidas por query
 * builder, CA-7).
 */
final readonly class ItensDoPosto
{
    /** `null` quando tudo é do posto; senão, a recusa com o primeiro item estranho. */
    public function confere(DiaDeclarado $dia, int $postoId): ?RecusaDaGravacao
    {
        $pedidos = [
            ['Bico', 'bico', array_column($dia->leituras, 'bico_id')],
            ['Combustivel', 'combustível', array_column($dia->leituras, 'combustivel_id')],
            ['Frentista', 'frentista', [...array_column($dia->sessoes, 'frentista_id'), ...$dia->frentistasConhecidos]],
            ['FormaPagamento', 'forma de pagamento', array_column($dia->recebimentos, 'forma_pagamento_id')],
        ];

        foreach ($pedidos as [$tabela, $nome, $ids]) {
            $estranho = self::primeiroDeFora($tabela, $ids, $postoId);
            if ($estranho !== null) {
                return new RecusaDaGravacao('item_de_outro_posto', "O {$nome} {$estranho} não é deste posto.");
            }
        }

        return null;
    }

    /** @param  list<int>  $ids */
    private static function primeiroDeFora(string $tabela, array $ids, int $postoId): ?int
    {
        $ids = array_values(array_unique($ids));
        if ($ids === []) {
            return null;
        }

        $doPosto = DB::table($tabela)->whereIn('id', $ids)->where('posto_id', $postoId)->pluck('id')->map(static fn (mixed $id): int => is_numeric($id) ? (int) $id : 0)->all();
        $fora = array_values(array_diff($ids, $doPosto));

        return $fora === [] ? null : $fora[0];
    }
}
