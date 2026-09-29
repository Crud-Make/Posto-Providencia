<?php

declare(strict_types=1);

namespace App\Financeiro\Application;

/**
 * Um "Lançar" da tela: a chave de idempotência (um UUID por tentativa) e as despesas, na ordem.
 */
final readonly class LancamentoDeDespesas
{
    /** @param  list<DespesaDeclarada>  $despesas */
    public function __construct(
        public string $chave,
        public array $despesas,
    ) {}
}
