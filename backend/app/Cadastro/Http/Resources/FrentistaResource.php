<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Frentista;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Frentista */
final class FrentistaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'telefone' => $this->telefone,
            'data_admissao' => $this->data_admissao,
            'ativo' => $this->ativo,
            'turno_id' => $this->turno_id,
            'turno' => new TurnoResource($this->whenLoaded('turno')),
        ];
    }
}
