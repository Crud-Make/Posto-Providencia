<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Resources;

use App\Fechamento\Domain\Leitura;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serializa um encerrante.
 *
 * **Dinheiro e litros saem como STRING decimal, nunca float** — é o que os casts `decimal:2` e
 * `decimal:3` do model entregam e o que o PostgREST já entregava. Número cru em JSON perde
 * centavo na volta; quem converte é o cliente, com o helper de dinheiro.
 *
 * `bico_id`, `combustivel_id`, `turno_id` saem como inteiro e SEM relação aninhada: esses models
 * são de `Cadastro`, e nenhum módulo depende de outro (CA-7, Pest Arch). Quem quiser o bico pede
 * o catálogo.
 *
 * @mixin Leitura
 */
final class LeituraResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'data' => $this->data->toIso8601ZuluString(),
            'bico_id' => $this->bico_id,
            'combustivel_id' => $this->combustivel_id,
            'turno_id' => $this->turno_id,
            'leitura_inicial' => $this->leitura_inicial,
            'leitura_final' => $this->leitura_final,
            'litros_vendidos' => $this->litros_vendidos,
            'preco_litro' => $this->preco_litro,
            'valor_total' => $this->valor_total,
        ];
    }
}
