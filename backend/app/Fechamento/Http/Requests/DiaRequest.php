<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `?data=AAAA-MM-DD` — a validação de dia, compartilhada por P5–P7 (Design Doc §3).
 * Data inválida vira 422 do framework, nunca 500 nem dia errado em silêncio.
 * A autorização é dos middlewares `token.atual` e `posto.acesso`, não daqui.
 */
final class DiaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'data' => ['required', 'date_format:Y-m-d'],
        ];
    }

    /** O dia pedido, normalizado em UTC — o fuso em que `Leitura.data` é gravada. */
    public function dia(): CarbonImmutable
    {
        /** @var string $data */
        $data = $this->validated('data');

        // Construtor e não `createFromFormat`: este devolve `false`/null em data inválida, e ali
        // o PHPStan estaria certo em reclamar. O `date_format:Y-m-d` já barrou o inválido antes.
        return new CarbonImmutable($data.' 00:00:00', 'UTC');
    }
}
