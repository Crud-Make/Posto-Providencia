<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Compartilhado\Posto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um posto na tela "Em qual posto?" do PWA do frentista (#101). Só `id` e `nome`: a rota é
 * pública, e nada do cadastro do posto (cnpj, endereço, telefone, e-mail) sai dela.
 *
 * @mixin Posto
 */
final class PostoParaEscolherResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'nome' => $this->nome];
    }
}
