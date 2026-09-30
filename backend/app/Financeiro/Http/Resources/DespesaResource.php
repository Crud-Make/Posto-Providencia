<?php

declare(strict_types=1);

namespace App\Financeiro\Http\Resources;

use App\Financeiro\Domain\Despesa;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Uma despesa como a aba Receitas e Despesas a usa. `valor` em string decimal (sem float); `data`
 * e `data_pagamento` em `AAAA-MM-DD` — as colunas são `date`.
 *
 * @mixin Despesa
 */
final class DespesaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'descricao' => $this->descricao,
            'categoria' => $this->categoria,
            'categoria_id' => $this->categoria_id,
            'valor' => $this->valor,
            'data' => substr((string) $this->data, 0, 10),
            'status' => $this->status,
            'recorrente' => $this->recorrente,
            'data_pagamento' => $this->data_pagamento === null ? null : substr((string) $this->data_pagamento, 0, 10),
            'observacoes' => $this->observacoes,
        ];
    }
}
