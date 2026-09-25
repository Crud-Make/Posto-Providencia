<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Controllers;

use App\Fechamento\Application\EnviosDoDiaParaOFrentista;
use App\Fechamento\Application\HistoricoDoFrentista;
use App\Fechamento\Application\RegistraEnvioDoFrentista;
use App\Fechamento\Http\Requests\EnvioDoTurnoRequest;
use App\Fechamento\Http\Requests\EnviosDoDiaRequest;
use App\Fechamento\Http\Requests\HistoricoRequest;
use App\Fechamento\Http\Resources\ItemDoHistoricoResource;
use App\Fechamento\Http\Resources\RespostaDoEnvio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * O fechamento de turno do frentista autenticado por PIN (#101): o envio (fatia 1), a lista "quem já
 * enviou" do dia e o histórico do próprio frentista (fatia 2).
 *
 * A regra é da Application; a tradução para HTTP (201, 200 na repetição, 409, 422) é do
 * {@see RespostaDoEnvio} — o controller não conhece Domain (Pest Arch).
 */
final readonly class EnvioDoFrentistaController
{
    public function __construct(private RegistraEnvioDoFrentista $registra) {}

    /** `POST /api/postos/{posto}/envios` */
    public function store(EnvioDoTurnoRequest $request): JsonResponse
    {
        return RespostaDoEnvio::de(($this->registra)($request->envio(), $request->frentistaId()));
    }

    /** `GET /api/postos/{posto}/envios?data=AAAA-MM-DD` */
    public function doDia(EnviosDoDiaRequest $request, EnviosDoDiaParaOFrentista $envios): JsonResponse
    {
        return response()->json(['data' => $envios($request->dia(), $request->frentistaId())]);
    }

    /** `GET /api/postos/{posto}/historico` */
    public function historico(HistoricoRequest $request, HistoricoDoFrentista $historico): AnonymousResourceCollection
    {
        return ItemDoHistoricoResource::collection($historico($request->frentistaId()));
    }
}
