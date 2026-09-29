<?php

declare(strict_types=1);

namespace App\Financeiro\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `GET /api/postos/{posto}/categorias-financeiras?tipo=despesa|receita` — sem `tipo`, todas. */
final class CategoriasRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['tipo' => ['sometimes', 'in:despesa,receita']];
    }

    public function tipo(): ?string
    {
        return $this->has('tipo') ? $this->string('tipo')->toString() : null;
    }
}
