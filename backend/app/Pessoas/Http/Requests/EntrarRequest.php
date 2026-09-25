<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Corpo do `POST /api/login`. `dispositivo` dá nome ao token ("painel", "pwa-frentista") para a
 * lista de sessões abertas dizer de onde cada uma veio.
 */
final class EntrarRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'senha' => ['required', 'string', 'max:255'],
            'dispositivo' => ['sometimes', 'string', 'max:60'],
        ];
    }

    public function email(): string
    {
        return $this->string('email')->toString();
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
