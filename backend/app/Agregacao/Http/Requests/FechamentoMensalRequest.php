<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Requests;

use App\Agregacao\Application\Periodo;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `GET /api/postos/{posto}/fechamento-mensal/{ano}/{mes}` (Design Doc agregacao.md §5). O mês vem do
 * caminho, e o caminho entra na validação por `prepareForValidation`: mês 13 é 422, não 500.
 * Autorização fica na rota (`token.atual` + `posto.acesso`), não aqui.
 */
final class FechamentoMensalRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['ano' => $this->route('ano'), 'mes' => $this->route('mes')]);
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'ano' => ['required', 'integer', 'between:2000,2100'],
            'mes' => ['required', 'integer', 'between:1,12'],
        ];
    }

    /** O mês civil inteiro, do dia 1 ao último. */
    public function mes(): Periodo
    {
        $inicio = sprintf('%04d-%02d-01', $this->integer('ano'), $this->integer('mes'));

        return (new Periodo($inicio, $inicio))->mesCivil();
    }
}
