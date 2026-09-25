<?php

declare(strict_types=1);

namespace App\Estoque\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/** `GET /api/postos/{posto}/regua/medicoes?data=AAAA-MM-DD` (#101, fatia 2). */
final class MedicoesDoDiaRequest extends FormRequest
{
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
