<?php

declare(strict_types=1);

namespace App\Financeiro\Application;

/**
 * Uma despesa como a tela a manda (#103): Nova Despesa, uma Despesa Fixa ou a Taxa de Cartão de um
 * provedor. `valor` em string decimal (reais, 2 casas) e `data` `AAAA-MM-DD` são gravados COMO
 * VIERAM — a `data` decide o mês do rateio. O posto NÃO está aqui de propósito: vem da rota.
 */
final readonly class DespesaDeclarada
{
    public function __construct(
        public string $descricao,
        public ?string $categoria,
        public ?int $categoriaId,
        public string $valor,
        public string $data,
        public string $status,
        public bool $recorrente,
        public ?string $dataPagamento,
        public ?string $observacoes,
    ) {}
}
