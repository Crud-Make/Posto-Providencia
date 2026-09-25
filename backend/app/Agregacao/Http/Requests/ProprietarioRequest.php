<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Requests;

use App\Agregacao\Application\Periodo;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `GET /api/postos/{posto}/proprietario?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` (#100, Visão do Proprietário).
 *
 * O período fica DENTRO de um mês: é o que a tela pede (o mês até hoje, ou só hoje), e é o que
 * faz a compra do mês civil ser exatamente o `custo_epoca` da RPC `get_dashboard_proprietario` —
 * o custo do mês DA LEITURA. Período que atravessa meses teria mais de um mês de leitura, e somar
 * as compras dos dois esconderia essa diferença. Autorização fica na rota (`posto.acesso:gerir`).
 */
final class ProprietarioRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'inicio' => ['required', 'date_format:Y-m-d'],
            'fim' => ['required', 'date_format:Y-m-d', 'after_or_equal:inicio', $this->mesmoMesDoInicio(...)],
        ];
    }

    public function periodo(): Periodo
    {
        return new Periodo(
            inicio: $this->string('inicio')->toString(),
            fim: $this->string('fim')->toString(),
        );
    }

    private function mesmoMesDoInicio(string $atributo, mixed $valor, Closure $falha): void
    {
        $inicio = $this->string('inicio')->toString();
        if (! is_string($valor) || substr($valor, 0, 7) !== substr($inicio, 0, 7)) {
            $falha('O período da Visão do Proprietário fica dentro de um mês.');
        }
    }
}
