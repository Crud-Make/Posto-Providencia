<?php

declare(strict_types=1);

namespace App\Compras\Application;

use Carbon\CarbonImmutable;

/**
 * O "Salvar" do Registro de Compras (#103): a chave de idempotência, o dia (hoje no mês corrente,
 * o último dia do mês num mês passado — quem escolhe é a tela), o fornecedor e um item por
 * combustível. Um combustível aparece uma vez só (o FormRequest recusa repetido).
 */
final readonly class RegistroDeclarado
{
    /** @param  non-empty-list<ItemDoRegistro>  $itens */
    public function __construct(
        public string $chave,
        public CarbonImmutable $dia,
        public ?int $fornecedorId,
        public array $itens,
    ) {}

    /** @return list<ItemDoRegistro> */
    public function compras(): array
    {
        return array_values(array_filter($this->itens, static fn (ItemDoRegistro $item): bool => $item->temCompra()));
    }

    /** @return list<ItemDoRegistro> */
    public function reguas(): array
    {
        return array_values(array_filter($this->itens, static fn (ItemDoRegistro $item): bool => $item->tanqueId !== null));
    }

    /** O dia como o Postgres o guarda em `Compra.data` (timestamptz) e `HistoricoTanque.data` (date). */
    public function diaIso(): string
    {
        return $this->dia->utc()->format('Y-m-d');
    }
}
