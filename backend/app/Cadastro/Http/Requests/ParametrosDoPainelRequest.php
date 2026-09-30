<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `PUT /api/postos/{posto}/parametros` (#103) — os três parâmetros de Configurações:
 *
 *     { tolerancia_divergencia: "50.00" (R$, string decimal ≥ 0, até 2 casas),
 *       dias_estoque_critico: int ≥ 1, dias_estoque_baixo: int ≥ 1 }
 *
 * Gravados em texto (`Configuracao.valor`); a tolerância sai com 2 casas.
 */
final class ParametrosDoPainelRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'tolerancia_divergencia' => ['required', 'string', 'regex:/^\d{1,8}(\.\d{1,2})?$/'],
            'dias_estoque_critico' => ['required', 'integer', 'min:1', 'max:365'],
            'dias_estoque_baixo' => ['required', 'integer', 'min:1', 'max:365'],
        ];
    }

    /** @return array<string, string> */
    public function valores(): array
    {
        [$reais, $centavos] = array_pad(explode('.', $this->string('tolerancia_divergencia')->toString()), 2, '');

        return [
            'tolerancia_divergencia' => $reais.'.'.str_pad($centavos, 2, '0'),
            'dias_estoque_critico' => (string) $this->integer('dias_estoque_critico'),
            'dias_estoque_baixo' => (string) $this->integer('dias_estoque_baixo'),
        ];
    }
}
