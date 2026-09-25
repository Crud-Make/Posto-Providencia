<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\FechamentoFrentista;
use Illuminate\Database\Eloquent\Collection;

/**
 * Os últimos 20 envios do frentista do TOKEN, do mais novo para o mais antigo (#101, fatia 2) — o
 * porte de `buscarHistoricoDoFrentista` do PWA. O posto é o `PostoAtual` (escopo do trait): o
 * histórico que o frentista vê no BR não traz o que ele enviou no Jorro, e vice-versa. O pai vem
 * junto (eager loading) para a tela mostrar o dia.
 */
final readonly class HistoricoDoFrentista
{
    public const int LIMITE = 20;

    /** @return Collection<int, FechamentoFrentista> */
    public function __invoke(int $frentistaId): Collection
    {
        return FechamentoFrentista::query()
            ->with('fechamento:id,data,turno_id')
            ->where('frentista_id', $frentistaId)
            ->orderByDesc('id')
            ->limit(self::LIMITE)
            ->get();
    }
}
