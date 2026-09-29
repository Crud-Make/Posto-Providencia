<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Controllers;

use App\Cadastro\Application\FormasDePagamentoDoPosto;
use App\Cadastro\Application\ParametrosDoPosto;
use App\Cadastro\Http\Requests\FormaDePagamentoDoPainelRequest;
use App\Cadastro\Http\Requests\ParametrosDoPainelRequest;
use App\Cadastro\Http\Resources\RespostaDoCadastro;
use Illuminate\Http\JsonResponse;

/**
 * Tela Configurações do painel pela API (#103): formas de pagamento e parâmetros. O posto vem da
 * rota (`DefinePostoAtual`), nunca do corpo; forma de outro posto é 404.
 */
final readonly class ConfiguracoesController
{
    public function __construct(
        private FormasDePagamentoDoPosto $formas,
        private ParametrosDoPosto $parametros,
    ) {}

    /** `POST /api/postos/{posto}/formas-pagamento` — 201 com a forma criada. */
    public function criaForma(FormaDePagamentoDoPainelRequest $request): JsonResponse
    {
        return RespostaDoCadastro::de($this->formas->cadastrar($request->forma()), 201);
    }

    /** `PUT /api/postos/{posto}/formas-pagamento/{forma}` — desativar é `ativo: false`. */
    public function editaForma(FormaDePagamentoDoPainelRequest $request): JsonResponse
    {
        return RespostaDoCadastro::de($this->formas->editar($request->formaId(), $request->forma()) ?? abort(404), 200);
    }

    /** `GET /api/postos/{posto}/parametros` — as três chaves; `null` se o posto não tem a linha. */
    public function parametros(): JsonResponse
    {
        return response()->json(['data' => $this->parametros->ler()]);
    }

    /** `PUT /api/postos/{posto}/parametros` — upsert das três chaves. */
    public function gravaParametros(ParametrosDoPainelRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->parametros->gravar($request->valores())]);
    }
}
