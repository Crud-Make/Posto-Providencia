<?php

declare(strict_types=1);

namespace App\Estoque\Domain;

/**
 * Uma escrita do PWA no módulo Estoque foi RECUSADA — um VALOR, não uma exceção (o mesmo desenho do
 * `RecusaDaGravacao` do Fechamento, que este módulo não pode importar: CA-7).
 *
 * Códigos: `produto_invalido`, `sem_estoque`, `chave_reutilizada` (venda); `tanque_invalido`,
 * `fora_da_janela` (régua).
 */
final readonly class RecusaDoEstoque
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
