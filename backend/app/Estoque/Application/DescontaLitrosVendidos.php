<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Compartilhado\Eventos\LeiturasDoDiaGravadas;
use App\Estoque\Domain\Estoque;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Desconta do estoque os litros vendidos num dia.
 *
 * **Reproduz o comportamento do painel, por decisão do dono em 20/09/2026** (§7 (b) do
 * `fechamento-diario-api.md`), com tudo o que isso implica:
 *
 * - desconta **por combustível**, não por bico (`leitura.service.ts:352-377`);
 * - **não devolve** quando o dia é regravado, porque o `deleteByDate` nunca devolveu
 *   (`:413-430`). Logo, **regravar o dia desconta de novo, pelo total inteiro**. É defeito
 *   conhecido e mantido de propósito; consertar é issue própria;
 * - **falha não derruba o salvamento.** No painel o erro de estoque é `console.warn` e o dia é
 *   salvo do mesmo jeito (`:379-392`). Por isso este ouvinte captura tudo e registra: lançar
 *   aqui transformaria um aviso em rollback do dia inteiro, que é mudança de comportamento.
 *
 * O evento é ouvido **depois do commit** (registro em `AppServiceProvider`), pelo mesmo motivo:
 * o desconto é consequência de um dia já gravado, não condição para gravá-lo.
 */
final readonly class DescontaLitrosVendidos implements ShouldHandleEventsAfterCommit
{
    public function handle(LeiturasDoDiaGravadas $evento): void
    {
        foreach ($evento->litrosPorCombustivel as $combustivelId => $litros) {
            try {
                $estoque = Estoque::query()
                    ->where('combustivel_id', $combustivelId)
                    ->first();

                if ($estoque === null) {
                    // Combustível sem linha de estoque não é erro: o painel também só desconta
                    // de quem tem (`leitura.service.ts:365-370`).
                    continue;
                }

                $atual = $estoque->quantidade_atual;

                // Estreitar, e não castar: `bcsub` exige numeric-string, e um valor não numérico
                // (coluna corrompida, evento malformado) tem de virar AVISO, como no painel — não
                // exceção que derruba o resto do laço.
                if (! is_numeric($atual) || ! is_numeric($litros)) {
                    Log::warning('Estoque com valor não numérico; combustível ignorado', [
                        'posto_id' => $evento->postoId,
                        'combustivel_id' => $combustivelId,
                        'quantidade_atual' => $atual,
                        'litros' => $litros,
                    ]);

                    continue;
                }

                $estoque->quantidade_atual = bcsub($atual, $litros, 3);
                $estoque->ultima_atualizacao = now();
                $estoque->save();
            } catch (Throwable $erro) {
                // Um combustível que falha não impede os outros, e nenhum impede o dia.
                Log::warning('Estoque não descontado', [
                    'posto_id' => $evento->postoId,
                    'dia' => $evento->dia,
                    'combustivel_id' => $combustivelId,
                    'litros' => $litros,
                    'erro' => $erro->getMessage(),
                ]);
            }
        }
    }
}
