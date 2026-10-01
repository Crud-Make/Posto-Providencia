<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Corpo do `POST /api/login`, em um de dois formatos:
 *   - `{email, senha}` — o login de sempre;
 *   - `{posto_id, usuario, senha}` — o nome de usuário no cartão do posto escolhido.
 * `dispositivo` dá nome ao token ("painel", "pwa-frentista") para a lista de sessões abertas dizer
 * de onde cada uma veio.
 */
final class EntrarRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'email' => ['required_without:usuario', 'string', 'email', 'max:255'],
            'usuario' => ['required_without:email', 'required_with:posto_id', 'string', 'max:255'],
            'posto_id' => ['required_with:usuario', 'integer', 'min:1'],
            'senha' => ['required', 'string', 'max:255'],
            'dispositivo' => ['sometimes', 'string', 'max:60'],
        ];
    }

    public function peloPosto(): bool
    {
        return $this->filled('usuario');
    }

    public function email(): string
    {
        return $this->string('email')->toString();
    }

    public function usuario(): string
    {
        return $this->string('usuario')->toString();
    }

    public function postoId(): int
    {
        return $this->integer('posto_id');
    }

    public function senha(): string
    {
        return $this->string('senha')->toString();
    }

    public function dispositivo(): string
    {
        return $this->string('dispositivo', 'painel')->toString();
    }
}
