<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Requests;

use App\Compartilhado\LeFrentistaDoToken;
use Illuminate\Foundation\Http\FormRequest;

/** `GET /api/postos/{posto}/historico` (#101, fatia 2): sem parâmetro — o histórico é do frentista do token. */
final class HistoricoRequest extends FormRequest
{
    use LeFrentistaDoToken;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [];
    }
}
