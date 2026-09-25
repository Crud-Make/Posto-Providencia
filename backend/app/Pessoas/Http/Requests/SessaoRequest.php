<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Requests;

use App\Pessoas\Domain\Usuario;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Rotas da sessão (`/api/eu`, `/api/sair`): não há corpo para validar, só o usuário que o
 * middleware `token.atual` resolveu e deixou nos atributos da requisição.
 */
final class SessaoRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [];
    }

    public function usuario(): Usuario
    {
        $usuario = $this->attributes->get('usuario');

        return $usuario instanceof Usuario ? $usuario : abort(401, 'Token ausente.');
    }
}
