<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Controllers;

use App\Fechamento\Application\RegistraEnvioDoFrentista;
use App\Fechamento\Http\Requests\EnvioDoTurnoRequest;
use App\Fechamento\Http\Resources\RespostaDoEnvio;
use Illuminate\Http\JsonResponse;

/**
 * `POST /api/postos/{posto}/envios` — o fechamento de turno do frentista autenticado por PIN (#101).
 *
 * A regra é do Command; a tradução para HTTP (201, 200 na repetição, 409, 422) é do
 * {@see RespostaDoEnvio} — o controller não conhece Domain (Pest Arch).
 */
final readonly class EnvioDoFrentistaController
{
    public function __construct(private RegistraEnvioDoFrentista $registra) {}

    public function store(EnvioDoTurnoRequest $request): JsonResponse
    {
        return RespostaDoEnvio::de(($this->registra)($request->envio(), $request->frentistaId()));
    }
}
