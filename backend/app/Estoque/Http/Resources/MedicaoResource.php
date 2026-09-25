<?php

declare(strict_types=1);

namespace App\Estoque\Http\Resources;

use App\Estoque\Domain\MedicaoDeTanque;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Uma medição de régua (#101): `volume_fisico` em string decimal; `data` é o dia (`AAAA-MM-DD`).
 *
 * @mixin MedicaoDeTanque
 */
final class MedicaoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'tanque_id' => $this->tanque_id,
            'data' => $this->data->format('Y-m-d'),
            'volume_fisico' => $this->volume_fisico,
        ];
    }
}
