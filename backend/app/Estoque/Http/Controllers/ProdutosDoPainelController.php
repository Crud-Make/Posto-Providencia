<?php

declare(strict_types=1);

namespace App\Estoque\Http\Controllers;

use App\Estoque\Application\CadastroDeProdutos;
use App\Estoque\Application\RegistraMovimentacaoDeEstoque;
use App\Estoque\Http\Requests\MovimentacaoDoPainelRequest;
use App\Estoque\Http\Requests\ProdutoDoPainelRequest;
use App\Estoque\Http\Resources\ProdutoDoPainelResource;
use App\Estoque\Http\Resources\RespostaDoEstoque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * A tela "Produtos e Estoque" do painel pela API (painel-pela-api.md §12): a lista dos produtos da
 * loja, o "Novo/Editar Produto" e a "Registrar Movimentação". O posto vem da rota (`DefinePostoAtual`),
 * nunca do corpo; produto de outro posto é 404 na edição e 422 na movimentação.
 */
final readonly class ProdutosDoPainelController
{
    public function __construct(private CadastroDeProdutos $cadastro) {}

    /** `GET /api/postos/{posto}/estoque/produtos` — ativos, por nome, com o custo. */
    public function index(): AnonymousResourceCollection
    {
        return ProdutoDoPainelResource::collection($this->cadastro->listar());
    }

    /** `POST /api/postos/{posto}/estoque/produtos` — idempotente pela `chave`. */
    public function store(ProdutoDoPainelRequest $request): JsonResponse
    {
        return RespostaDoEstoque::doProduto($this->cadastro->cadastrar($request->chave(), $request->produto(), $request->estoqueInicial()));
    }

    /** `PUT /api/postos/{posto}/estoque/produtos/{produto}` */
    public function update(ProdutoDoPainelRequest $request): ProdutoDoPainelResource
    {
        return new ProdutoDoPainelResource($this->cadastro->editar($request->produtoId(), $request->produto()) ?? abort(404));
    }

    /** `POST /api/postos/{posto}/estoque/movimentacoes` — idempotente pela `chave`. */
    public function movimentar(MovimentacaoDoPainelRequest $request, RegistraMovimentacaoDeEstoque $registra): JsonResponse
    {
        return RespostaDoEstoque::daMovimentacao($registra($request->movimentacao()));
    }
}
