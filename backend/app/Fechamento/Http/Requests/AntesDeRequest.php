<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `?antes_de=AAAA-MM-DD` de `GET /leituras/ultimas`. Data inválida é 422 do framework.
 * A autorização é dos middlewares `token.atual` e `posto.acesso`, não daqui.
 */
final class AntesDeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'antes_de' => ['required', 'date_format:Y-m-d'],
        ];
    }

    /** O dia de corte, em UTC — o fuso em que `Leitura.data` é gravada. Ele mesmo fica de fora. */
    public function dia(): CarbonImmutable
    {
        return new CarbonImmutable($this->string('antes_de')->toString().' 00:00:00', 'UTC');
    }
}
