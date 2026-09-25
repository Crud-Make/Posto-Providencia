<?php

declare(strict_types=1);

namespace App\Estoque\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use UnexpectedValueException;

/**
 * `PUT /api/postos/{posto}/regua/medicoes` — `{ tanque_id, data: "AAAA-MM-DD", volume_fisico }`.
 *
 * `volume_fisico` em string decimal (até 2 casas), como o dinheiro: número JSON é 422. Espelha o
 * `CHECK` da policy de INSERT (`volume_fisico IS NOT NULL AND >= 0`) e o teto de `numeric(10,2)`
 * (99.999.999,99) — o mesmo `medicaoParaGravarSchema` do PWA.
 */
final class GravaMedicaoRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'tanque_id' => ['required', 'integer', 'min:1'],
            'data' => ['required', 'date_format:Y-m-d'],
            'volume_fisico' => ['required', 'string', 'regex:/^\d{1,8}(\.\d{1,2})?$/'],
        ];
    }

    public function tanqueId(): int
    {
        return $this->integer('tanque_id');
    }

    public function dia(): CarbonImmutable
    {
        return new CarbonImmutable($this->string('data')->toString().' 00:00:00', 'UTC');
    }

    /** @return numeric-string */
    public function volumeFisico(): string
    {
        $volume = $this->string('volume_fisico')->toString();

        return is_numeric($volume) ? $volume : throw new UnexpectedValueException('Validação deixou passar um não decimal.');
    }
}
