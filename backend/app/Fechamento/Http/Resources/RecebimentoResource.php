<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Resources;

use App\Fechamento\Domain\Recebimento;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um recebimento do fechamento. `valor` sai como string decimal.
 *
 * `forma_pagamento_id` e `maquininha_id` ficam inteiros: são de `Cadastro` (CA-7).
 *
 * @mixin Recebimento
 */
final class RecebimentoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fechamento_id' => $this->fechamento_id,
            'forma_pagamento_id' => $this->forma_pagamento_id,
            'maquininha_id' => $this->maquininha_id,
            'valor' => $this->valor,
            'observacoes' => $this->observacoes,
        ];
    }
}
