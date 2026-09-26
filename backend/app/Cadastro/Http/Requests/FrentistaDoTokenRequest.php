<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use App\Compartilhado\LeFrentistaDoToken;
use Illuminate\Foundation\Http\FormRequest;

/** Rotas do PWA sem corpo nem query (#101): só o frentista do token. */
final class FrentistaDoTokenRequest extends FormRequest
{
    use LeFrentistaDoToken;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [];
    }
}
