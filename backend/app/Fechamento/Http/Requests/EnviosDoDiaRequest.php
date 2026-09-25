<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Requests;

use App\Compartilhado\LeFrentistaDoToken;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/** `GET /api/postos/{posto}/envios?data=AAAA-MM-DD` (#101, fatia 2): o dia e o frentista do token. */
final class EnviosDoDiaRequest extends FormRequest
{
    use LeFrentistaDoToken;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['data' => ['required', 'date_format:Y-m-d']];
    }

    public function dia(): CarbonImmutable
    {
        return new CarbonImmutable($this->string('data')->toString().' 00:00:00', 'UTC');
    }
}
