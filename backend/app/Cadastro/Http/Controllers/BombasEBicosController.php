<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Controllers;

use App\Cadastro\Application\BicosDoPosto;
use App\Cadastro\Application\BombasDoPosto;
use App\Cadastro\Http\Requests\BicoDoPainelRequest;
use App\Cadastro\Http\Requests\BombaDoPainelRequest;
use App\Cadastro\Http\Resources\RespostaDoCadastro;
use Illuminate\Http\JsonResponse;

/**
 * Cadastro de bombas e bicos do painel pela API (#153). O posto vem da rota (`DefinePostoAtual`),
 * nunca do corpo; bomba ou bico de outro posto é 404; recusa de regra é 422 `{ erro: { codigo, mensagem } }`.
 */
final readonly class BombasEBicosController
{
    public function __construct(
        private BombasDoPosto $bombas,
        private BicosDoPosto $bicos,
    ) {}

    /** `POST /api/postos/{posto}/bombas` — 201 com a bomba criada. */
    public function criaBomba(BombaDoPainelRequest $request): JsonResponse
    {
        return RespostaDoCadastro::de($this->bombas->cadastrar($request->bomba()), 201);
    }

    /** `PUT /api/postos/{posto}/bombas/{bomba}` — desativar é `ativo: false`. */
    public function editaBomba(BombaDoPainelRequest $request): JsonResponse
    {
        return RespostaDoCadastro::de($this->bombas->editar($request->bombaId(), $request->bomba()) ?? abort(404), 200);
    }

    /** `POST /api/postos/{posto}/bicos` — 201 com o bico criado (com bomba, combustível e tanque). */
    public function criaBico(BicoDoPainelRequest $request): JsonResponse
    {
        return RespostaDoCadastro::de($this->bicos->cadastrar($request->bico()), 201);
    }

    /** `PUT /api/postos/{posto}/bicos/{bico}` — desativar é `ativo: false`. */
    public function editaBico(BicoDoPainelRequest $request): JsonResponse
    {
        return RespostaDoCadastro::de($this->bicos->editar($request->bicoId(), $request->bico()) ?? abort(404), 200);
    }
}
