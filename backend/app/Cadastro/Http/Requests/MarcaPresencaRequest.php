<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/postos/{posto}/presenca` (#101): sem corpo. O frentista é o do token, que o middleware
 * `frentista.do.posto` deixou nos atributos como inteiro.
 */
final class MarcaPresencaRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [];
    }

    public function frentistaId(): int
    {
        $id = $this->attributes->get('frentista_id');

        return is_int($id) ? $id : abort(500, 'Guard fora de ordem: sem frentista.');
    }
}
