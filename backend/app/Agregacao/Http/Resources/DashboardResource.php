<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Resources;

use App\Agregacao\Application\AgregadoDoPeriodo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Corpo de `GET /api/postos/{posto}/dashboard` (Design Doc agregacao.md §5): `periodo`,
 * `produtos` e `rateio`, sem envelope `data` — o contrato aprovado é a raiz do JSON.
 * Sem `custo_taxas` (DECISÃO 3) e sem lucro (DECISÃO 1). Não existe `despesas_total` na raiz:
 * despesa e litros do rateio saem colados à janela do mês civil ({@see RateioDoMesCivilResource}).
 *
 * @mixin AgregadoDoPeriodo
 */
final class DashboardResource extends JsonResource
{
    /** @var string|null */
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'periodo' => [
                'inicio' => $this->periodo->inicio,
                'fim' => $this->periodo->fim,
            ],
            'produtos' => ProdutoAgregadoResource::collection($this->produtos),
            'rateio' => new RateioDoMesCivilResource($this->rateio),
        ];
    }
}
