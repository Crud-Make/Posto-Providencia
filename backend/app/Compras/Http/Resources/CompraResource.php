<?php

declare(strict_types=1);

namespace App\Compras\Http\Resources;

use App\Compras\Domain\Compra;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Uma `Compra` gravada pelo "Salvar". Litros, dinheiro e custo em string decimal; `data` em ISO
 * 8601 Zulu, como o `FechamentoResource`.
 *
 * @mixin Compra
 */
final class CompraResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'combustivel_id' => $this->combustivel_id,
            'fornecedor_id' => $this->fornecedor_id,
            'data' => $this->data->utc()->toIso8601ZuluString(),
            'quantidade_litros' => $this->quantidade_litros,
            'valor_total' => $this->valor_total,
            'custo_por_litro' => $this->custo_por_litro,
        ];
    }
}
