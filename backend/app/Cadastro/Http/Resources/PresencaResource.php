<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\PresencaFrentista;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Presença de um frentista. Leva a FOTO, que o catálogo público de frentistas esconde: esta rota
 * exige login e acesso ao posto, o catálogo ainda não.
 *
 * @mixin PresencaFrentista
 */
final class PresencaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'frentista_id' => $this->frentista_id,
            'nome' => $this->frentista?->nome,
            'foto' => $this->frentista?->foto,
            'visto_em' => $this->visto_em->utc()->toIso8601ZuluString(),
        ];
    }
}
