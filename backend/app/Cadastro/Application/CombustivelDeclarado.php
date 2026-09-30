<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

/**
 * O que o formulário de combustível do painel manda (#157). O preço de venda é o ponto de partida
 * do dia na aba Leituras (decisão do dono, 27/09), em string decimal com 2 casas — como a coluna
 * `numeric(10,2)` o guarda, sem passar por float. O preço de custo é o que o gerente informa, `null` quando
 * ele não sabe (decisão do dono, 30/09: nenhuma compra de combustível o atualiza).
 * O posto NÃO está aqui de propósito: vem da rota.
 */
final readonly class CombustivelDeclarado
{
    public function __construct(
        public string $nome,
        public string $codigo,
        public ?string $cor,
        public string $precoVenda,
        public ?string $precoCusto,
        public bool $ativo,
    ) {}
}
