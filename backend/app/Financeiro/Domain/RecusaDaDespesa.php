<?php

declare(strict_types=1);

namespace App\Financeiro\Domain;

/**
 * Um lançamento de despesas foi RECUSADO — um VALOR, não uma exceção (o mesmo desenho do
 * `RecusaDaCompra`, que este módulo não pode importar: CA-7).
 *
 * Códigos: `categoria_invalida` (422), `chave_reutilizada` (409 — a chave já lançou em outro posto).
 */
final readonly class RecusaDaDespesa
{
    public function __construct(
        public string $codigo,
        public string $mensagem,
    ) {}

    /** O código é conflito com o que já está gravado (409), e não entrada inválida (422). */
    public function ehConflito(): bool
    {
        return $this->codigo === 'chave_reutilizada';
    }
}
