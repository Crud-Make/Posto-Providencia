<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Controllers;

use App\Cadastro\Application\MarcaPresenca;
use App\Cadastro\Application\PresencasDoPosto;
use App\Cadastro\Http\Requests\MarcaPresencaRequest;
use App\Cadastro\Http\Resources\PresencaResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final readonly class PresencaController
{
    public function __construct(private PresencasDoPosto $presencas) {}

    public function index(): AnonymousResourceCollection
    {
        return PresencaResource::collection(($this->presencas)());
    }

    /** `POST /api/postos/{posto}/presenca` — o sinal de vida do frentista do token (#101). */
    public function marcar(MarcaPresencaRequest $request, MarcaPresenca $marca): Response
    {
        $marca($request->frentistaId());

        return response()->noContent();
    }
}
