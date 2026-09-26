<?php

declare(strict_types=1);

namespace App\Compras\Application;

use App\Compras\Domain\Compra;
use Illuminate\Database\Eloquent\Collection;

/**
 * O "Salvar" gravado (ou o já gravado, quando `repetido`): as linhas de `Compra` com a chave e as
 * réguas do dia dos tanques tocados, relidas do banco.
 */
final readonly class RegistroGravado
{
    /**
     * @param  Collection<int, Compra>  $compras
     * @param  list<array{tanque_id: int, data: string, volume_livro: ?string, volume_fisico: ?string}>  $medicoes
     */
    public function __construct(
        public Collection $compras,
        public array $medicoes,
        public bool $repetido,
    ) {}
}
