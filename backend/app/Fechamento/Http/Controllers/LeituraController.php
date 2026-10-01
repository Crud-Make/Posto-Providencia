<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Controllers;

use App\Fechamento\Application\GravaLeiturasDoEncerrante;
use App\Fechamento\Application\LeiturasDoDia;
use App\Fechamento\Application\UltimasLeiturasAntesDe;
use App\Fechamento\Http\Requests\AntesDeRequest;
use App\Fechamento\Http\Requests\GravaLeiturasDoEncerranteRequest;
use App\Fechamento\Http\Requests\PeriodoRequest;
use App\Fechamento\Http\Resources\LeituraResource;
use App\Fechamento\Http\Resources\RespostaDasLeituras;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * `GET /api/postos/{posto}/leituras?data=AAAA-MM-DD[&ate=AAAA-MM-DD]` — os encerrantes do dia
 * (#103, fatia P5), ou do período com `ate` (aba Fechamento Mensal).
 * `GET /api/postos/{posto}/leituras/ultimas?antes_de=AAAA-MM-DD` — a última leitura de cada bico
 * antes do dia (o encerrante inicial de um dia novo).
 * `PUT /api/postos/{posto}/leituras?data=AAAA-MM-DD` — o PWA do dono (#102) grava SÓ os encerrantes do
 * dia, sem fechar o caixa. Só quem GERE o posto; a recusa volta como 422 por {@see RespostaDasLeituras}.
 *
 * Primeira rota do sistema a nascer protegida: `token.atual` diz quem é, `DefinePostoAtual`
 * resolve o posto, `posto.acesso` diz se pode ver. O controller não conhece `posto_id` nem
 * autorização — só pede e serializa.
 */
final class LeituraController
{
    public function __construct(
        private readonly LeiturasDoDia $leiturasDoDia,
        private readonly UltimasLeiturasAntesDe $ultimasLeituras,
        private readonly GravaLeiturasDoEncerrante $gravaLeituras,
    ) {}

    public function index(PeriodoRequest $request): AnonymousResourceCollection
    {
        return LeituraResource::collection(($this->leiturasDoDia)($request->dia(), $request->ultimoDia()));
    }

    public function ultimas(AntesDeRequest $request): AnonymousResourceCollection
    {
        return LeituraResource::collection(($this->ultimasLeituras)($request->dia()));
    }

    public function update(GravaLeiturasDoEncerranteRequest $request): JsonResponse
    {
        $resultado = ($this->gravaLeituras)($request->dia(), $request->leituras(), $request->usuarioId());

        return RespostaDasLeituras::de($resultado);
    }
}
