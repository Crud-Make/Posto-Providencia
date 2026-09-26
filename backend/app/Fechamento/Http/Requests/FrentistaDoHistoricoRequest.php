<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `GET /api/postos/{posto}/equipe/{frentista}/historico` — sem parâmetro além do `{frentista}` da rota. */
final class FrentistaDoHistoricoRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [];
    }

    public function frentistaId(): int
    {
        $id = $this->route('frentista');

        return is_numeric($id) ? (int) $id : 0;
    }
}
