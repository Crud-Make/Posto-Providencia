<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Frentista;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um frentista na tela de escolha do PWA, ANTES do PIN (#101). Só `id`, `nome` e `tem_chave` (se já
 * criou o PIN — decide entre "Crie sua chave" e "PIN", 27/09/2026): a rota é pública, e nada além
 * disso sai dela — nunca o hash.
 *
 * @mixin Frentista
 *
 * @property Frentista $resource
 */
final class FrentistaParaEscolherResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'nome' => $this->nome, 'tem_chave' => $this->resource->getAttribute('tem_chave') === true];
    }
}
