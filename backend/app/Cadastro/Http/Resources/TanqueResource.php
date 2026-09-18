<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Tanque;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Tanque */
final class TanqueResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'combustivel_id' => $this->combustivel_id,
            'capacidade' => $this->capacidade,
            'estoque_atual' => $this->estoque_atual,
            'ativo' => $this->ativo,
            'combustivel' => new CombustivelResource($this->whenLoaded('combustivel')),
        ];
    }
}
