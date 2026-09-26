<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\Leitura;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * A leitura mais recente de CADA bico estritamente antes de um dia — o encerrante inicial de um dia
 * ainda sem leitura é o final do último dia lançado antes dele (`useLeituras.ts`, modo criação).
 *
 * Reproduz `leituraService.getLastReading(postoId, anteriorA)` (`leitura.service.ts:185-215`):
 * `data < 'AAAA-MM-DD'` (meia-noite UTC do dia), a mais nova por `data` e, no empate, por `id`.
 * Com uma diferença a favor do dado: o Supabase pegava as 200 linhas mais novas e deduplicava no
 * cliente, então um bico cuja última leitura ficasse fora dessas 200 sumia da lista — e a tela o
 * semeava com `0,000`, o odômetro inteiro virando venda. Aqui é `DISTINCT ON (bico_id)` no Postgres:
 * todo bico com alguma leitura anterior aparece, sem teto.
 *
 * O filtro de posto é o `PertenceAoPosto` do model (TEN-1), como em {@see LeiturasDoDia}.
 */
final readonly class UltimasLeiturasAntesDe
{
    /** @return Collection<int, Leitura> */
    public function __invoke(CarbonImmutable $dia): Collection
    {
        // Offset explícito no valor ligado — a sessão do Postgres não é garantidamente UTC
        // (ver LeiturasDoDia). O instante é a meia-noite UTC do dia pedido, exclusiva.
        $limite = $dia->utc()->startOfDay()->format('Y-m-d H:i:sP');

        return Leitura::query()
            ->distinct(['bico_id'])
            ->where('data', '<', $limite)
            ->orderBy('bico_id')
            ->orderByDesc('data')
            ->orderByDesc('id')
            ->get();
    }
}
