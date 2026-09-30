<?php

declare(strict_types=1);

namespace App\Financeiro\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `GET /api/postos/{posto}/receitas?inicio=AAAA-MM-DD&fim=AAAA-MM-DD` — competência pela `data`. */
final class ReceitasDoPeriodoRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'inicio' => ['required', 'date_format:Y-m-d'],
            'fim' => ['required', 'date_format:Y-m-d', 'after_or_equal:inicio'],
        ];
    }

    public function inicio(): string
    {
        return $this->string('inicio')->toString();
    }

    public function fim(): string
    {
        return $this->string('fim')->toString();
    }
}
