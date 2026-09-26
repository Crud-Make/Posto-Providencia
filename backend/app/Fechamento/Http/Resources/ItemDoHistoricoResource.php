<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Resources;

use App\Fechamento\Domain\FechamentoFrentista;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um envio no histórico do PRÓPRIO frentista (#101, fatia 2): as colunas que o PWA lê hoje
 * (`buscarHistoricoDoFrentista`) e o dia do pai. Dinheiro em string decimal (`decimal:2`), `null`
 * continua `null` (I8). `fechamento.data` sai `AAAA-MM-DD` — o dia do caixa, não um instante.
 *
 * @mixin FechamentoFrentista
 */
final class ItemDoHistoricoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $pai = $this->fechamento;

        return [
            'id' => $this->id,
            'encerrante' => $this->encerrante,
            'valor_pix' => $this->valor_pix,
            'valor_dinheiro' => $this->valor_dinheiro,
            'valor_moedas' => $this->valor_moedas,
            'valor_cartao_debito' => $this->valor_cartao_debito,
            'valor_cartao_credito' => $this->valor_cartao_credito,
            'valor_nota' => $this->valor_nota,
            'baratao' => $this->baratao,
            'diferenca_calculada' => $this->diferenca_calculada,
            'valor_conferido' => $this->valor_conferido,
            'observacoes' => $this->observacoes,
            'data_hora_envio' => $this->data_hora_envio?->utc()->toIso8601ZuluString(),
            'fechamento' => $pai === null ? null : [
                'data' => $pai->data->utc()->format('Y-m-d'),
                'turno_id' => $pai->turno_id,
            ],
        ];
    }
}
