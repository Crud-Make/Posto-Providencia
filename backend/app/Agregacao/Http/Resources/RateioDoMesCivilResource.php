<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Resources;

use App\Agregacao\Application\RateioDoMesCivil;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bloco `rateio` do contrato (Design Doc agregacao.md §5): a janela do mês civil e os dois insumos
 * de `despesaOperacionalPorLitro` (lucro.ts:36-41) somados nela. Dinheiro e volume saem como a
 * string decimal que veio do Postgres; nenhum cast numérico e nenhuma divisão aqui (DECISÃO 1).
 *
 * @mixin RateioDoMesCivil
 */
final class RateioDoMesCivilResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'mes_civil' => [
                'inicio' => $this->mesCivil->inicio,
                'fim' => $this->mesCivil->fim,
            ],
            'despesas_total' => $this->despesasTotal,
            'litros_vendidos' => $this->litrosVendidos,
        ];
    }
}
