<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `PUT /api/postos/{posto}/foto` — `{ foto: "data:image/jpeg;base64,…" | null }`; `null` remove.
 *
 * Espelha o CHECK `posto_foto_tamanho` da coluna (banco/init/13-foto-do-posto.sql): JPEG em data URL
 * com até 300.000 caracteres, ou `null`. Sem esta validação o erro seria de constraint do Postgres
 * (500); com ela é 422. O `regex` exige base64 de verdade depois do prefixo, para a rota pública
 * conseguir decodificar o que foi gravado.
 */
final class TrocaFotoDoPostoRequest extends FormRequest
{
    public const int TETO_DATA_URL = 300000;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'foto' => [
                'present', 'nullable', 'string', 'starts_with:data:image/jpeg;base64,', 'max:'.self::TETO_DATA_URL,
                'regex:/^data:image\/jpeg;base64,[A-Za-z0-9+\/]+={0,2}$/',
            ],
        ];
    }

    public function postoId(): int
    {
        return (int) $this->route('posto');
    }

    public function foto(): ?string
    {
        $foto = $this->validated('foto');

        return is_string($foto) ? $foto : null;
    }
}
