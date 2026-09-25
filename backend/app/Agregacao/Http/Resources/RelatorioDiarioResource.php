<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Resources;

use App\Agregacao\Application\RelatorioDoDia;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Corpo de `GET /api/postos/{posto}/relatorio-diario` — raiz do JSON, sem envelope `data`. As
 * linhas saem como {@see RelatorioDoDia} as leu: decimal em string, `null` onde o banco tem `null`.
 *
 * @property array{fechamentos: list<array<string, mixed>>, despesas: list<array<string, mixed>>} $resource
 */
final class RelatorioDiarioResource extends JsonResource
{
    /** @var string|null */
    public static $wrap = null;

    /**
     * @param  array{fechamentos: list<array<string, mixed>>, despesas: list<array<string, mixed>>}  $relatorio
     */
    public function __construct(array $relatorio, private readonly string $dia)
    {
        parent::__construct($relatorio);
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['data' => $this->dia] + $this->resource;
    }
}
