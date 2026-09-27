<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

/**
 * Uma escrita de cadastro do painel foi RECUSADA — um VALOR, não uma exceção (o mesmo desenho do
 * `RecusaDoEstoque`, que este módulo não pode importar: CA-7). Sempre 422.
 *
 * Códigos (#153, bombas e bicos): `nome_repetido`, `bomba_com_bicos_ativos` (bomba);
 * `bomba_invalida`, `combustivel_invalido`, `tanque_invalido`, `numero_repetido`,
 * `combustivel_travado` (bico).
 */
final readonly class RecusaDoCadastro
{
    public function __construct(
        public string $codigo,
        public string $mensagem,
    ) {}
}
