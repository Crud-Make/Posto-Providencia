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
 * consulta, a partir do `PostoAtual` que o `DefinePostoAtual` definiu. Quem esquecer o trait é
 * reprovado por TEN-1 (`tests/Feature/Arquitetura/EscopoDeTenantTest.php`).
 */
final readonly class LeiturasDoDia
{
    /** @return Collection<int, Leitura> */
    public function __invoke(CarbonImmutable $dia): Collection
    {
        // `Leitura.data` é timestamp EM UTC. Comparar em horário local escorrega cada leitura um
        // dia para trás — bug já visto neste sistema. Por isso a janela é [00:00 UTC, +1 dia), e
        // não `whereDate`, que aplicaria o fuso da conexão.
        $inicio = $dia->utc()->startOfDay();

        return Leitura::query()
            ->where('data', '>=', $inicio)
            ->where('data', '<', $inicio->addDay())
            ->orderBy('bico_id')
            ->get();
    }
}
