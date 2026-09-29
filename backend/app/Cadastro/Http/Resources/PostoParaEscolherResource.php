<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Application\FotoDoPosto;
use App\Compartilhado\Posto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um posto na tela "Em qual posto?" do PWA do frentista (#101) e nos cartões da tela de entrada.
 * Só `id`, `nome` e o CAMINHO da foto da fachada (ou `null`): a rota é pública, e nada do cadastro
 * do posto (cnpj, endereço, telefone, e-mail) sai dela — nem o data URL da foto.
 *
 * @mixin Posto
 */
final class PostoParaEscolherResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'foto' => FotoDoPosto::caminho($this->id, $this->foto_atualizada_em),
        ];
    }
}
