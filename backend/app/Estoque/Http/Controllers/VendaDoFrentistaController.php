<?php

declare(strict_types=1);

namespace App\Estoque\Http\Controllers;

use App\Estoque\Application\ProdutosAVenda;
use App\Estoque\Application\RegistraVendaDoFrentista;
use App\Estoque\Application\VendasDoFrentista;
use App\Estoque\Http\Requests\RegistraVendaRequest;
use App\Estoque\Http\Requests\VendasDoFrentistaRequest;
use App\Estoque\Http\Resources\ProdutoAVendaResource;
use App\Estoque\Http\Resources\RespostaDoEstoque;
use App\Estoque\Http\Resources\VendaResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** A tela de Vendas do PWA pela API (#101, fatia 2): produtos do posto, vendas de hoje e o carrinho. */
final readonly class VendaDoFrentistaController
{
    /** `GET /api/postos/{posto}/produtos` */
    public function produtos(ProdutosAVenda $produtos): AnonymousResourceCollection
    {
        return ProdutoAVendaResource::collection($produtos());
    }

    /** `GET /api/postos/{posto}/vendas?inicio=…&fim=…` — do frentista do token. */
    public function index(VendasDoFrentistaRequest $request, VendasDoFrentista $vendas): AnonymousResourceCollection
    {
        return VendaResource::collection($vendas($request->frentistaId(), $request->inicio(), $request->fim()));
    }

    /** `POST /api/postos/{posto}/vendas` — idempotente pela `chave`. */
    public function store(RegistraVendaRequest $request, RegistraVendaDoFrentista $registra): JsonResponse
    {
        return RespostaDoEstoque::daVenda($registra($request->carrinho(), $request->frentistaId()));
    }
}
