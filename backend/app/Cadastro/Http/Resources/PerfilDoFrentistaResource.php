<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Frentista;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * O perfil do PRÓPRIO frentista do token (#101): `id`, `nome` e `foto` (data URL, ou `null`). A foto
 * sai aqui — e só aqui, para o dono dela — de propósito: o model a esconde (`$hidden`) para nenhuma
 * outra serialização a levar sem querer.
 *
 * @mixin Frentista
 */
final class PerfilDoFrentistaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'nome' => $this->nome, 'foto' => $this->foto];
    }
}
