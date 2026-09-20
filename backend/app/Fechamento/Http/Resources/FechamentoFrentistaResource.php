<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Resources;

use App\Fechamento\Domain\FechamentoFrentista;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serializa o envio de um frentista: os sete baldes, o encerrante declarado e o conferido.
 *
 * **`null` continua `null`, NUNCA `'0.00'`** (invariante I8). A diferença é de significado: `null`
 * é "o frentista não informou este balde"; `'0.00'` é "informou zero". Trocar um pelo outro
 * inventa um dado que ninguém digitou — e é o mesmo erro do dia não apurado virar zero.
 *
 * Dinheiro sai como STRING decimal, pelo cast `decimal:2` do model. `frentista_id` fica inteiro:
 * `Frentista` é de `Cadastro`, e nenhum módulo depende de outro (CA-7).
 *
 * @mixin FechamentoFrentista
 */
final class FechamentoFrentistaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fechamento_id' => $this->fechamento_id,
            'frentista_id' => $this->frentista_id,
            'valor_dinheiro' => $this->valor_dinheiro,
            'valor_cartao' => $this->valor_cartao,
            'valor_cartao_debito' => $this->valor_cartao_debito,
            'valor_cartao_credito' => $this->valor_cartao_credito,
            'valor_pix' => $this->valor_pix,
            'valor_nota' => $this->valor_nota,
            'valor_moedas' => $this->valor_moedas,
            'baratao' => $this->baratao,
            'baratencia' => $this->baratencia,
            'valor_conferido' => $this->valor_conferido,
            'encerrante' => $this->encerrante,
            'diferenca_calculada' => $this->diferenca_calculada,
            'observacoes' => $this->observacoes,
            'data_hora_envio' => $this->data_hora_envio?->toIso8601ZuluString(),
        ];
    }
}
