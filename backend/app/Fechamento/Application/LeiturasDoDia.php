<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\Leitura;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * Encerrantes de um dia, do posto atual.
 *
 * O filtro de posto NÃO aparece aqui: o trait `PertenceAoPosto` põe `posto_id = <atual>` em toda
 * consulta, a partir do `PostoAtual` que o `DefinePostoAtual` definiu. Cobrado por TEN-1.
 */
final readonly class LeiturasDoDia
{
    /**
     * @param  CarbonImmutable|null  $ultimoDia  último dia do período, inclusive; `null` = só `$dia`.
     *                                           A aba Fechamento Mensal pede o mês inteiro assim.
     * @return Collection<int, Leitura>
     */
    public function __invoke(CarbonImmutable $dia, ?CarbonImmutable $ultimoDia = null): Collection
    {
        $inicio = $dia->utc()->startOfDay();
        $fim = ($ultimoDia ?? $dia)->utc()->startOfDay()->addDay();

        // `Leitura.data` é `timestamptz` e todo escritor grava meia-noite UTC. A conexão desta
        // aplicação está em **America/Sao_Paulo** (medido em 20/09/2026, `show timezone`), não em
        // UTC — então um Carbon ligado como string SEM offset seria reinterpretado como horário de
        // Brasília e a janela escorregaria três horas. É o mesmo bug de "leitura um dia para trás"
        // que já mordeu este sistema. Por isso o offset vai EXPLÍCITO no valor ligado: o instante
        // deixa de depender do fuso da sessão. `whereDate` depende, e por isso não serve aqui.
        return Leitura::query()
            ->where('data', '>=', $inicio->format('Y-m-d H:i:sP'))
            ->where('data', '<', $fim->format('Y-m-d H:i:sP'))
            ->orderBy('data')
            ->orderBy('bico_id')
            ->get();
    }
}
