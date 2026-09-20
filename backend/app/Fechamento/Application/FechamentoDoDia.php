<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\Fechamento;
use Carbon\CarbonImmutable;

/**
 * O fechamento de um dia, com os recebimentos — ou `null` se o dia não tem fechamento.
 *
 * **Devolve UM, o mais recente, e não a lista.** O dia pode ter mais de uma linha: o índice de
 * produção é `UNIQUE (data, turno_id)` e, em Postgres, `NULL` não colide com `NULL`
 * (`01-esquema-base.sql:757`). O `getDoDia` do painel resolve isso ordenando por `id` decrescente
 * e pegando 1 (`fechamento.service.ts:45-60`, com o porquê escrito lá desde 16/08). Esta Query
 * reproduz a mesma regra: ler de um jeito e gravar de outro já acertou linhas diferentes no mesmo
 * dia neste sistema.
 *
 * Os recebimentos vêm com `with()` explícito porque `preventLazyLoading` está ligado fora de
 * produção — N+1 aqui viraria exceção no teste, que é onde deve virar.
 */
final readonly class FechamentoDoDia
{
    public function __invoke(CarbonImmutable $dia): ?Fechamento
    {
        $inicio = $dia->utc()->startOfDay();
        $fim = $inicio->addDay();

        // Offset EXPLÍCITO no valor ligado: a conexão pode não estar em UTC e string sem offset
        // seria relida como horário local, escorregando a janela. Ver `LeiturasDoDia`.
        return Fechamento::query()
            ->with('recebimentos')
            ->where('data', '>=', $inicio->format('Y-m-d H:i:sP'))
            ->where('data', '<', $fim->format('Y-m-d H:i:sP'))
            ->orderByDesc('id')
            ->first();
    }
}
