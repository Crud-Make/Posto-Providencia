<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

/**
 * O que o formulário de forma de pagamento de Configurações manda (#103): nome, tipo, taxa em % e
 * status. A taxa vai em string decimal com até 2 casas, como a coluna `numeric(5,2)`. O posto NÃO
 * está aqui de propósito: vem da rota.
 */
final readonly class FormaDePagamentoDeclarada
{
    public function __construct(
        public string $nome,
        public string $tipo,
        public string $taxa,
        public bool $ativo,
    ) {}
}
