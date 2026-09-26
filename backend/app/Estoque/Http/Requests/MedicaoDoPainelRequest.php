<?php

declare(strict_types=1);

namespace App\Estoque\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use UnexpectedValueException;

/**
 * `PUT /api/postos/{posto}/tanques/medicoes` — `{ tanque_id, data: "AAAA-MM-DD", volume_fisico }`,
 * a "Nova Medição (Régua)" do painel (painel-pela-api.md §11).
 *
 * `volume_fisico` em string decimal (número JSON é 422). Aceita as casas que o float do painel tiver
 * — hoje o `parseFloat` do modal vai ao PostgREST como número JSON e o `numeric(10,2)` arredonda; aqui
 * o cliente manda `String(numero)` e o Postgres arredonda do mesmo jeito. Até 7 dígitos inteiros:
 * nenhum tanque passa de 9.999.999 L, e assim o arredondamento nunca estoura o `numeric(10,2)`.
 * O teto da capacidade continua na tela, como hoje.
 */
final class MedicaoDoPainelRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'tanque_id' => ['required', 'integer', 'min:1'],
            'data' => ['required', 'date_format:Y-m-d'],
            'volume_fisico' => ['required', 'string', 'regex:/^\d{1,7}(\.\d{1,20})?$/'],
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
