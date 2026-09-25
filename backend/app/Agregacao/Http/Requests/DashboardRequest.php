<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Requests;

use App\Agregacao\Application\Periodo;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `GET /api/postos/{posto}/dashboard?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` (Design Doc agregacao.md §5).
 *
 * Autorização fica na rota, não aqui: `token.atual` + `posto.acesso:gerir` (PostoPolicy::gerir),
 * então este request só valida o período. Sem token 401, sem gerir o posto 403 (routes/api.php).
 */
final class DashboardRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'inicio' => ['required', 'date_format:Y-m-d'],
            'fim' => ['required', 'date_format:Y-m-d', 'after_or_equal:inicio'],
        ];
    }

    public function periodo(): Periodo
    {
        return new Periodo(
            inicio: $this->string('inicio')->toString(),
            fim: $this->string('fim')->toString(),
        );
    }
}
