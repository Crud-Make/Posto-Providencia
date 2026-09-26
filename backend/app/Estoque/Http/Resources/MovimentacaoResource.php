<?php

declare(strict_types=1);

namespace App\Estoque\Http\Resources;

use App\Estoque\Domain\MovimentacaoEstoque;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Uma linha de `MovimentacaoEstoque` gravada pelo painel (painel-pela-api.md §12). `data` em ISO 8601
 * UTC — a hora do servidor.
 *
 * @mixin MovimentacaoEstoque
 */
final class MovimentacaoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'produto_id' => $this->produto_id,
            'tipo' => $this->tipo,
            'quantidade' => $this->quantidade,
            'data' => $this->data?->utc()->toIso8601String(),
            'observacao' => $this->observacao,
        ];
    }
}
