<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Combustivel;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Combustivel */
final class CombustivelResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'codigo' => $this->codigo,
            'cor' => $this->cor,
            'ativo' => $this->ativo,
            'preco_venda' => $this->preco_venda,
            'preco_custo' => $this->preco_custo,
        ];
    }
}
