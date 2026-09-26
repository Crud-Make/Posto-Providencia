<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `GET /api/postos/{posto}/relatorio-diario?data=YYYY-MM-DD` (#103, Relatório Diário).
 *
 * Autorização fica na rota: `token.atual` + `posto.acesso:gerir` (o relatório traz despesa e
 * lucro, dado de proprietário, como o `/dashboard`). Aqui só se valida o dia.
 */
final class RelatorioDiarioRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'data' => ['required', 'date_format:Y-m-d'],
        ];
    }

    public function dia(): string
    {
        return $this->string('data')->toString();
    }
}
