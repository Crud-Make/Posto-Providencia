<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Resources;

use App\Agregacao\Application\ProdutoAgregado;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um item de `produtos` do contrato (Design Doc agregacao.md §5). Volume e dinheiro saem como a
 * string decimal que veio do Postgres; nenhum cast numérico aqui.
 *
 * @mixin ProdutoAgregado
 */
final class ProdutoAgregadoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'combustivel_id' => $this->combustivelId,
            'produto' => $this->produto,
            'litros_vendidos' => $this->litrosVendidos,
            'receita' => $this->receita,
            'compras' => [
                'litros' => $this->comprasLitros,
                'valor_total' => $this->comprasValorTotal,
            ],
        ];
    }
}
