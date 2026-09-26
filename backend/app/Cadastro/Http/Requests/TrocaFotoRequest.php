<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use App\Compartilhado\LeFrentistaDoToken;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `PUT /api/postos/{posto}/frentistas/eu/foto` — `{ foto: "data:image/jpeg;base64,…" | null }`.
 *
 * Espelha o CHECK `frentista_foto_tamanho` da coluna (banco/init/01-esquema-base.sql:663): JPEG em
 * data URL com até 40.000 caracteres, ou `null`. Sem esta validação o erro seria de constraint do
 * Postgres (500); com ela é 422. O limite é o mesmo `TETO_DATA_URL` do PWA
 * (`entities/frentista/lib/foto.ts`), que reduz a imagem antes de mandar.
 */
final class TrocaFotoRequest extends FormRequest
{
    use LeFrentistaDoToken;

    public const int TETO_DATA_URL = 40000;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'foto' => ['present', 'nullable', 'string', 'starts_with:data:image/jpeg;base64,', 'max:'.self::TETO_DATA_URL],
        ];
    }

    public function foto(): ?string
    {
        $foto = $this->validated('foto');

        return is_string($foto) ? $foto : null;
    }
}
