<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Controllers;

use App\Cadastro\Application\FrentistaDoPwa;
use App\Cadastro\Http\Requests\FrentistaDoTokenRequest;
use App\Cadastro\Http\Requests\TrocaFotoRequest;
use App\Cadastro\Http\Resources\FrentistaParaEscolherResource;
use App\Cadastro\Http\Resources\PerfilDoFrentistaResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * O frentista no PWA pela API (#101, fatia 2). O posto vem da rota; o frentista do perfil e da foto
 * vem do TOKEN (`frentista.do.posto`), nunca de parâmetro.
 */
final readonly class FrentistaDoPwaController
{
    public function __construct(private FrentistaDoPwa $frentistas) {}

    /** `GET /api/postos/{posto}/frentistas/escolha` — pública (a escolha vem antes do PIN). */
    public function escolha(): AnonymousResourceCollection
    {
        return FrentistaParaEscolherResource::collection($this->frentistas->paraEscolher());
    }

    /** `GET /api/postos/{posto}/frentistas/eu` */
    public function eu(FrentistaDoTokenRequest $request): PerfilDoFrentistaResource
    {
        return new PerfilDoFrentistaResource($this->frentistas->perfil($request->frentistaId()));
    }

    /** `PUT /api/postos/{posto}/frentistas/eu/foto` */
    public function trocaFoto(TrocaFotoRequest $request): PerfilDoFrentistaResource
    {
        return new PerfilDoFrentistaResource($this->frentistas->trocaFoto($request->frentistaId(), $request->foto()));
    }
}
