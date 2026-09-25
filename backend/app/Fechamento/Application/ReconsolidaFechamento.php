<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\ConsolidacaoDoDia;
use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\FechamentoFrentista;
use App\Fechamento\Domain\Leitura;
use Illuminate\Support\Facades\DB;

/**
 * Reconsolida o `Fechamento` a partir do banco — o lado de I/O de `consolidarFechamento`
 * (`packages/api-core/src/encerrante.ts`); a conta é do {@see ConsolidacaoDoDia}.
 *
 * As três leituras são as mesmas do TypeScript, e sem filtro a mais:
 * - as sessões do pai, por `fechamento_id` (sem filtro de posto: o filho é do pai);
 * - as leituras do posto do pai com `data` IGUAL à do pai — sem filtro de turno (a leitura é por
 *   dia e por bico; com o filtro, o encerrante do painel, `turno_id` NULL, nunca chegava à venda);
 * - a contagem de bicos ativos do posto, do cadastro. `Bico` é de Cadastro: tabela alheia se lê
 *   com query builder, nunca com model de outro módulo (CA-7).
 *
 * Grava `total_vendas`, `total_recebido` e `diferenca` no pai — `null` em venda e diferença quando
 * o dia não está apurado. O status do pai não muda (o TypeScript também não o toca).
 */
final readonly class ReconsolidaFechamento
{
    public function __invoke(Fechamento $pai): ConsolidacaoDoDia
    {
        $sessoes = FechamentoFrentista::query()
            ->withoutGlobalScope('posto')
            ->where('fechamento_id', $pai->id)
            ->get(ConsolidacaoDoDia::BALDES)
            ->map(static fn (FechamentoFrentista $linha): array => $linha->only(ConsolidacaoDoDia::BALDES))
            ->values()
            ->all();

        $leituras = Leitura::query()
            ->withoutGlobalScope('posto')
            ->where('posto_id', $pai->posto_id)
            ->where('data', $pai->data->utc()->format('Y-m-d H:i:sP'))
            ->pluck('valor_total')
            ->values()
            ->all();

        $bicosAtivos = DB::table('Bico')->where('posto_id', $pai->posto_id)->where('ativo', true)->count();

        $consolidacao = ConsolidacaoDoDia::de($sessoes, $leituras, $bicosAtivos);

        $pai->forceFill([
            'total_vendas' => $consolidacao->totalVendas,
            'total_recebido' => $consolidacao->totalRecebido,
            'diferenca' => $consolidacao->diferenca,
        ])->save();

        return $consolidacao;
    }
}
