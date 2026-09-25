<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\FechamentoFrentista;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * Sessões dos frentistas de um dia — os envios que alimentam o fechamento.
 *
 * Duas consultas de propósito, e não um `whereHas`: acha os `Fechamento` do dia e depois os
 * filhos (desenho de `fechamentoFrentista.service.ts:293-310`). Um dia pode ter mais de um
 * `Fechamento` — o unique é `(data, turno_id)`, não `(data)` —, então a lista de ids é plural.
 *
 * O filtro de posto não aparece aqui: é o `PertenceAoPosto`, nos dois models. Cobrado por TEN-1.
 */
final readonly class SessoesDoDia
{
    /**
     * @param  CarbonImmutable|null  $ultimoDia  último dia do período, inclusive; `null` = só `$dia`.
     * @return Collection<int, FechamentoFrentista>
     */
    public function __invoke(CarbonImmutable $dia, ?CarbonImmutable $ultimoDia = null): Collection
    {
        $inicio = $dia->utc()->startOfDay();
        $fim = ($ultimoDia ?? $dia)->utc()->startOfDay()->addDay();

        // Offset EXPLÍCITO no valor ligado, pelo mesmo motivo de `LeiturasDoDia`: a conexão está
        // em America/Sao_Paulo, não em UTC, e string sem offset seria lida como horário local.
        $fechamentos = Fechamento::query()
            ->where('data', '>=', $inicio->format('Y-m-d H:i:sP'))
            ->where('data', '<', $fim->format('Y-m-d H:i:sP'))
            ->pluck('id');

        return FechamentoFrentista::query()
            ->whereIn('fechamento_id', $fechamentos)
            ->orderBy('frentista_id')
            ->get();
    }
}
