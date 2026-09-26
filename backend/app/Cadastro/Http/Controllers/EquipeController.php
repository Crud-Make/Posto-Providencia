<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Controllers;

use App\Cadastro\Application\EquipeDoPosto;
use App\Cadastro\Http\Requests\FrentistaDaEquipeRequest;
use App\Cadastro\Http\Requests\FrentistaDaRotaRequest;
use App\Cadastro\Http\Resources\FrentistaDaEquipeResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * A gestão de equipe do painel pela API (#103, tela Frentistas). O posto vem da rota
 * (`DefinePostoAtual`), nunca do corpo; frentista de outro posto é 404.
 */
final readonly class EquipeController
{
    public function __construct(private EquipeDoPosto $equipe) {}

    /** `GET /api/postos/{posto}/equipe` — ativos e inativos, por nome. */
    public function index(): AnonymousResourceCollection
    {
        return FrentistaDaEquipeResource::collection($this->equipe->listar());
    }

    /** `POST /api/postos/{posto}/equipe` — 201 com o frentista criado. */
    public function store(FrentistaDaEquipeRequest $request): JsonResponse
    {
        return (new FrentistaDaEquipeResource($this->equipe->cadastrar($request->frentista())))
            ->response()
            ->setStatusCode(201);
    }

    /** `PUT /api/postos/{posto}/equipe/{frentista}` */
    public function update(FrentistaDaEquipeRequest $request): FrentistaDaEquipeResource
    {
        return new FrentistaDaEquipeResource(
            $this->equipe->editar($request->frentistaId(), $request->frentista()) ?? abort(404),
        );
    }

    /** `POST /api/postos/{posto}/equipe/{frentista}/desativar` — o "Excluir" da tela. */
    public function desativar(FrentistaDaRotaRequest $request): FrentistaDaEquipeResource
    {
        return new FrentistaDaEquipeResource($this->equipe->desativar($request->frentistaId()) ?? abort(404));
    }
}
