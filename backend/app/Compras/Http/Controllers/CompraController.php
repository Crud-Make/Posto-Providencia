<?php

declare(strict_types=1);

namespace App\Compras\Http\Controllers;

use App\Compras\Application\RegistraCompras;
use App\Compras\Http\Requests\RegistraComprasRequest;
use App\Compras\Http\Resources\RespostaDaCompra;
use Illuminate\Http\JsonResponse;

/** O "Salvar" do Registro de Compras do painel pela API (#103). */
final readonly class CompraController
{
    /** `POST /api/postos/{posto}/compras` — idempotente pela `chave`. */
    public function store(RegistraComprasRequest $request, RegistraCompras $registra): JsonResponse
    {
        return RespostaDaCompra::de($registra($request->registro()));
    }
}
