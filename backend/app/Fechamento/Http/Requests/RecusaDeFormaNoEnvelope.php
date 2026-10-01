<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * A recusa de FORMA do `PUT /leituras` (PWA do dono, #102) sai no mesmo envelope das recusas de domínio —
 * `{ erro: { codigo: 'corpo_invalido', mensagem, campos } }`, 422 —, como no `PUT /fechamento` (cópia: CA-7
 * proíbe importar o trait de outro módulo).
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
