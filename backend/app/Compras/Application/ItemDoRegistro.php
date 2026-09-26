<?php

declare(strict_types=1);

namespace App\Compras\Application;

/**
 * Um combustível do "Salvar" do Registro de Compras — o corpo do laço de `usePersistenciaRegistro`:
 *
 * - `litros`/`valorTotal`: a compra do dia. Os dois `null` quando o gerente não digitou compra
 *   (o painel só lança compra com litros > 0);
 * - `tanqueId`: o tanque do combustível que a tela mostra. `null` quando o combustível não tem
 *   tanque — aí não há régua a gravar nem `Tanque.estoque_atual` a somar;
 * - `volumeLivro`: o estoque escritural que a TELA calcula (`calcEstoqueHoje`), gravado como veio;
 * - `volumeFisico`: a régua digitada, `null` quando não foi medida (o upsert então não a toca).
 */
final readonly class ItemDoRegistro
{
    /**
     * @param  ?numeric-string  $litros
     * @param  ?numeric-string  $valorTotal
     * @param  ?numeric-string  $volumeLivro
     * @param  ?numeric-string  $volumeFisico
     */
    public function __construct(
        public int $combustivelId,
        public ?int $tanqueId,
        public ?string $litros,
        public ?string $valorTotal,
        public ?string $volumeLivro,
        public ?string $volumeFisico,
    ) {}

    public function temCompra(): bool
    {
        return $this->litros !== null && $this->valorTotal !== null;
    }
}
