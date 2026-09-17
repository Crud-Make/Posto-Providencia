<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Bico;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Bico */
final class BicoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'numero' => $this->numero,
            'ativo' => $this->ativo,
            'bomba' => new BombaResource($this->whenLoaded('bomba')),
            'combustivel' => new CombustivelResource($this->whenLoaded('combustivel')),
            'tanque' => new TanqueResource($this->whenLoaded('tanque')),
        ];
    }
}
