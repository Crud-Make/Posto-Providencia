<?php

declare(strict_types=1);

namespace App\Financeiro\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `GET /api/postos/{posto}/despesas?inicio=AAAA-MM-DD&fim=AAAA-MM-DD` (o período, competência pela
 * `data`) ou `?recorrentes=1` (as recorrentes de qualquer data — base das Despesas Fixas).
 */
final class DespesasDoPeriodoRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'recorrentes' => ['sometimes', 'in:1,true'],
            'inicio' => ['required_without:recorrentes', 'date_format:Y-m-d'],
            'fim' => ['required_without:recorrentes', 'date_format:Y-m-d', 'after_or_equal:inicio'],
        ];
    }

    public function soRecorrentes(): bool
    {
        return $this->has('recorrentes');
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
