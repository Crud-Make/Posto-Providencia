<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Resources;

use App\Agregacao\Application\MovimentoDoPosto;
use App\Agregacao\Application\Periodo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Corpo de `GET /api/postos/{posto}/movimento` — raiz do JSON, sem envelope `data`. As linhas
 * saem como {@see MovimentoDoPosto} as leu: decimal em string, nenhuma conta.
 *
 * @property array{leituras: list<array<string, mixed>>, compras: list<array<string, mixed>>, despesas: list<array<string, mixed>>, medicoes: list<array<string, mixed>>} $resource
 */
final class MovimentoResource extends JsonResource
{
    /** @var string|null */
    public static $wrap = null;

    /**
     * @param  array{leituras: list<array<string, mixed>>, compras: list<array<string, mixed>>, despesas: list<array<string, mixed>>, medicoes: list<array<string, mixed>>}  $movimento
     */
    public function __construct(array $movimento, private readonly Periodo $periodo)
    {
        parent::__construct($movimento);
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['periodo' => ['inicio' => $this->periodo->inicio, 'fim' => $this->periodo->fim]] + $this->resource;
    }
}
