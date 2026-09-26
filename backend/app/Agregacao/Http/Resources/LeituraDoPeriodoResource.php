<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Resources;

use App\Agregacao\Application\LeituraDoPeriodo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um item de `leituras` do contrato: o mínimo que `encerranteMensal` precisa (bico, dia e os dois
 * encerrantes). Os encerrantes saem como a string decimal do Postgres; nenhum cast numérico e
 * nenhuma conta aqui (DECISÃO 1).
 *
 * @mixin LeituraDoPeriodo
 */
final class LeituraDoPeriodoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'bico_id' => $this->bicoId,
            'data' => $this->data,
            'leitura_inicial' => $this->leituraInicial,
            'leitura_final' => $this->leituraFinal,
        ];
    }
}
