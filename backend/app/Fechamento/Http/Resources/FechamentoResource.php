<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Resources;

use App\Fechamento\Domain\Fechamento;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * O fechamento do dia.
 *
 * **`total_vendas` e `diferenca` saem `null` quando o dia não foi apurado** (invariante I8), e
 * NUNCA `'0.00'`. A distinção é o que separa "ninguém fechou este dia ainda" de "fechou e deu
 * zero" — e o segundo é uma afirmação sobre o dinheiro do posto que ninguém fez. Já houve bug
 * aqui: o painel gravava `0` em dia sem encerrante, e foi por isso que a coluna virou nullable.
 *
 * `usuario_id` e `turno_id` ficam inteiros: são de `Pessoas` e `Cadastro` (CA-7). Os recebimentos
 * vêm aninhados porque são do MESMO módulo — e `Recebimento` não tem `posto_id`, então só existe
 * escopado pelo pai (declarado em TEN-3).
 *
 * @mixin Fechamento
 */
final class FechamentoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'data' => $this->data->toIso8601ZuluString(),
            'total_vendas' => $this->total_vendas,
            'total_recebido' => $this->total_recebido,
            'diferenca' => $this->diferenca,
            'status' => $this->status->value,
            'observacoes' => $this->observacoes,
            'usuario_id' => $this->usuario_id,
            'turno_id' => $this->turno_id,
            'recebimentos' => RecebimentoResource::collection($this->whenLoaded('recebimentos')),
        ];
    }
}
