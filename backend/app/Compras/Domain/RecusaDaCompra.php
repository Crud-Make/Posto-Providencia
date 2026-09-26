<?php

declare(strict_types=1);

namespace App\Compras\Domain;

/**
 * Um "Salvar" do Registro de Compras foi RECUSADO — um VALOR, não uma exceção (o desenho do
 * `RecusaDoEstoque` e do `RecusaDaGravacao`, que este módulo não pode importar: CA-7).
 *
 * Códigos: `fornecedor_invalido`, `combustivel_invalido`, `tanque_invalido`, `fora_da_janela`,
 * `custo_fora_do_limite` (422) e `chave_reutilizada` (409).
 */
final readonly class RecusaDaCompra
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
