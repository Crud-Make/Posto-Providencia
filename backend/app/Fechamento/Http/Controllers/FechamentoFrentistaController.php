<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Controllers;

use App\Fechamento\Application\SessoesDoDia;
use App\Fechamento\Http\Requests\DiaRequest;
use App\Fechamento\Http\Resources\FechamentoFrentistaResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * `GET /api/postos/{posto}/sessoes?data=AAAA-MM-DD` — os envios dos frentistas do dia
 * (#103, fatia P6). Rota protegida, como toda rota nova desde a DECISÃO A.
 */
final class FechamentoFrentistaController
{
    public function __construct(private readonly SessoesDoDia $sessoesDoDia) {}

    public function index(DiaRequest $request): AnonymousResourceCollection
    {
        return FechamentoFrentistaResource::collection(($this->sessoesDoDia)($request->dia()));
    }
}
