<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Controllers;

use App\Cadastro\Application\FornecedoresDoPosto;
use App\Cadastro\Http\Requests\FornecedorDoPainelRequest;
use App\Cadastro\Http\Resources\RespostaDoFornecedor;
use Illuminate\Http\JsonResponse;

/**
 * Cadastro de fornecedores do painel pela API (#103). O posto vem da rota (`DefinePostoAtual`),
 * nunca do corpo; fornecedor de outro posto é 404; recusa de regra é 422 `{ erro: { codigo, mensagem } }`.
 * A lista segue no GET do catálogo (`/fornecedores`).
 */
final readonly class FornecedoresController
{
    public function __construct(private FornecedoresDoPosto $fornecedores) {}

    /** `POST /api/postos/{posto}/fornecedores` — 201 com o fornecedor criado. */
    public function cria(FornecedorDoPainelRequest $request): JsonResponse
    {
        return RespostaDoFornecedor::de($this->fornecedores->cadastrar($request->fornecedor()), 201);
    }

    /** `PUT /api/postos/{posto}/fornecedores/{fornecedor}` — 200 com o fornecedor editado. */
    public function edita(FornecedorDoPainelRequest $request): JsonResponse
    {
        return RespostaDoFornecedor::de($this->fornecedores->editar($request->fornecedorId(), $request->fornecedor()) ?? abort(404), 200);
    }
}
