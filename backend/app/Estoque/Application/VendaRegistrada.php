<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Estoque\Domain\VendaProduto;
use Illuminate\Database\Eloquent\Collection;

/** O carrinho gravado (ou o já gravado, quando `repetido`): uma linha de `VendaProduto` por produto. */
final readonly class VendaRegistrada
{
    /** @param  Collection<int, VendaProduto>  $linhas */
    public function __construct(
        public Collection $linhas,
        public bool $repetido,
    ) {}
}
