<?php

declare(strict_types=1);

namespace App\Agregacao\Http\Resources;

use App\Agregacao\Application\Periodo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Corpo de `GET /api/postos/{posto}/proprietario` — raiz do JSON, sem envelope `data`.
 * Decimal sempre em string, nenhum lucro (quem calcula é `@posto/utils`).
 *
 * @property array{
 *     produtos: list<array<string, mixed>>,
 *     despesas: list<string>,
 *     despesas_pendentes: list<string>,
 *     ultimo_fechamento: string|null
 * } $resource
 */
final class ProprietarioResource extends JsonResource
{
    /** @var string|null */
    public static $wrap = null;

    /**
     * @param  array{produtos: list<array<string, mixed>>, despesas: list<string>, despesas_pendentes: list<string>, ultimo_fechamento: string|null}  $resumo
     */
    public function __construct(array $resumo, private readonly Periodo $periodo)
    {
        parent::__construct($resumo);
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['periodo' => ['inicio' => $this->periodo->inicio, 'fim' => $this->periodo->fim]] + $this->resource;
    }
}
