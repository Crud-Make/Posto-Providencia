<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `POST /api/postos/{posto}/equipe/{frentista}/desativar` — sem corpo; só o `{frentista}` da rota. */
final class FrentistaDaRotaRequest extends FormRequest
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
