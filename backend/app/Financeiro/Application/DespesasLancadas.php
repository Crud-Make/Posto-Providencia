<?php

declare(strict_types=1);

namespace App\Financeiro\Application;

use App\Financeiro\Domain\Despesa;
use Illuminate\Database\Eloquent\Collection;

/** As linhas de um lançamento e se ele já tinha sido gravado antes (repetição da mesma chave). */
final readonly class DespesasLancadas
{
    /** @param  Collection<int, Despesa>  $despesas */
    public function __construct(
        public bool $repetido,
        public Collection $despesas,
    ) {}
}
