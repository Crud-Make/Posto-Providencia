<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Estoque\Domain\Produto;
use App\Estoque\Domain\VendaProduto;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * As vendas do frentista do TOKEN num intervalo de instantes (#101, fatia 2) — o porte de
 * `buscarVendasDeHoje`, da mais nova para a mais antiga.
 *
 * O "hoje" é do APARELHO: o PWA manda a meia-noite local convertida para UTC e a do dia seguinte
 * (`VendaProduto.data` é instante real; recortar em meia-noite UTC tiraria de "hoje" a venda das
 * 21h30 em Brasília). O servidor não decide o fuso.
 *
 * `VendaProduto` não tem `posto_id`: o filtro de posto é o produto — só entram vendas de produto
 * deste posto (a subconsulta leva o escopo do trait de {@see Produto}).
 */
final readonly class VendasDoFrentista
{
    /** @return Collection<int, VendaProduto> */
    public function __invoke(int $frentistaId, CarbonImmutable $inicio, CarbonImmutable $fim): Collection
    {
        return VendaProduto::query()
            ->with('produto:id,nome,categoria')
            ->where('frentista_id', $frentistaId)
            ->whereIn('produto_id', Produto::query()->select('id'))
            ->where('data', '>=', $inicio->utc()->format('Y-m-d H:i:sP'))
            ->where('data', '<', $fim->utc()->format('Y-m-d H:i:sP'))
            ->orderByDesc('data')
            ->orderByDesc('id')
            ->get();
    }
}
