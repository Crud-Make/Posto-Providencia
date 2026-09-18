<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Controllers;

use App\Cadastro\Application\CatalogoDoPosto;
use App\Cadastro\Http\Resources\BicoResource;
use App\Cadastro\Http\Resources\BombaResource;
use App\Cadastro\Http\Resources\CombustivelResource;
use App\Cadastro\Http\Resources\FormaPagamentoResource;
use App\Cadastro\Http\Resources\FornecedorResource;
use App\Cadastro\Http\Resources\FrentistaResource;
use App\Cadastro\Http\Resources\MaquininhaResource;
use App\Cadastro\Http\Resources\TanqueResource;
use App\Cadastro\Http\Resources\TurnoResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * `GET /api/postos/{posto}/…` — catálogo do posto, só leitura (Design Doc cadastro.md §3).
 * O posto vem do middleware `DefinePostoAtual`; o controller não conhece `posto_id`.
 */
final class CatalogoController
{
    public function __construct(private readonly CatalogoDoPosto $catalogo) {}

    public function combustiveis(): AnonymousResourceCollection
    {
        return CombustivelResource::collection($this->catalogo->combustiveis());
    }

    public function tanques(): AnonymousResourceCollection
    {
        return TanqueResource::collection($this->catalogo->tanques());
    }

    public function bombas(): AnonymousResourceCollection
    {
        return BombaResource::collection($this->catalogo->bombas());
    }

    public function bicos(): AnonymousResourceCollection
    {
        return BicoResource::collection($this->catalogo->bicos());
    }

    public function turnos(): AnonymousResourceCollection
    {
        return TurnoResource::collection($this->catalogo->turnos());
    }

    public function frentistas(): AnonymousResourceCollection
    {
        return FrentistaResource::collection($this->catalogo->frentistas());
    }

    public function formasPagamento(): AnonymousResourceCollection
    {
        return FormaPagamentoResource::collection($this->catalogo->formasPagamento());
    }

    public function maquininhas(): AnonymousResourceCollection
    {
        return MaquininhaResource::collection($this->catalogo->maquininhas());
    }

    public function fornecedores(): AnonymousResourceCollection
    {
        return FornecedorResource::collection($this->catalogo->fornecedores());
    }
}
