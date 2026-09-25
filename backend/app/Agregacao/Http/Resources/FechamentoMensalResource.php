<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Resources;

use App\Agregacao\Application\Periodo;
use App\Agregacao\Application\VendaDiariaDoMes;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Corpo de `GET /api/postos/{posto}/fechamento-mensal/{ano}/{mes}` — raiz do JSON, sem envelope
 * `data`. Os dias saem como {@see VendaDiariaDoMes} os leu: decimal em string, nenhuma conta.
 *
 * @property list<array<string, mixed>> $resource
 */
final class FechamentoMensalResource extends JsonResource
{
    /** @var string|null */
    public static $wrap = null;

    /** @param  list<array<string, mixed>>  $dias */
    public function __construct(array $dias, private readonly Periodo $mes)
    {
        parent::__construct($dias);
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'periodo' => ['inicio' => $this->mes->inicio, 'fim' => $this->mes->fim],
            // Objeto vazio, não lista vazia, quando o dia não tem litros por combustível: o
            // contrato é um mapa `combustivel_id → litros`.
            'dias' => array_map(static fn (array $dia): array => [
                ...$dia,
                'volumes_por_combustivel' => (object) $dia['volumes_por_combustivel'],
            ], $this->resource),
        ];
    }
}
