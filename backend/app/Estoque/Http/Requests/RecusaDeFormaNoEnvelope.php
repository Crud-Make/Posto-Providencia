<?php

declare(strict_types=1);

namespace App\Estoque\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * A recusa de FORMA das escritas do PWA no Estoque sai no mesmo envelope das recusas de domínio —
 * `{ erro: { codigo: 'corpo_invalido', mensagem, campos } }`, 422 —, como no `POST /envios`.
 *
 * @phpstan-require-extends FormRequest
 */
trait RecusaDeFormaNoEnvelope
{
    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'erro' => [
                'codigo' => 'corpo_invalido',
                'mensagem' => 'Corpo fora do contrato.',
                'campos' => $validator->errors()->toArray(),
            ],
        ], 422));
    }
}
