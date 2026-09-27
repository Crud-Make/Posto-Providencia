<?php

declare(strict_types=1);

namespace App\Pessoas\Domain;

/**
 * O primeiro acesso do frentista foi RECUSADO — um VALOR, não uma exceção (mesmo desenho do
 * `RecusaDoEstoque`; módulo não importa o Domain do outro, CA-7).
 *
 * - `nao_encontrado` (404): frentista inexistente, de outro posto ou inativo — a MESMA resposta
 *   para os três, para quem está do lado de fora não descobrir qual.
 * - `ja_tem_chave` (409): já existe PIN; só o gerente zera (`frentista:pin`).
 */
final readonly class RecusaDoPrimeiroAcesso
{
    public const string NAO_ENCONTRADO = 'nao_encontrado';

    public const string JA_TEM_CHAVE = 'ja_tem_chave';

    private function __construct(
        public string $codigo,
        public string $mensagem,
        public int $status,
    ) {}

    public static function naoEncontrado(): self
    {
        return new self(self::NAO_ENCONTRADO, 'Frentista não encontrado.', 404);
    }

    public static function jaTemChave(): self
    {
        return new self(self::JA_TEM_CHAVE, 'Este frentista já tem chave. Peça ao gerente para zerar.', 409);
    }
}
