<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Controllers;

use App\Fechamento\Application\LeiturasDoDia;
use App\Fechamento\Http\Requests\DiaRequest;
use App\Fechamento\Http\Resources\LeituraResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * `GET /api/postos/{posto}/leituras?data=AAAA-MM-DD` — os encerrantes do dia (#103, fatia P5).
 *
 * Primeira rota do sistema a nascer protegida: `token.atual` diz quem é, `DefinePostoAtual`
 * resolve o posto, `posto.acesso` diz se pode ver. O controller não conhece `posto_id` nem
 * autorização — só pede e serializa.
 */
final class LeituraController
{
    public function __construct(private readonly LeiturasDoDia $leiturasDoDia) {}

    public function index(DiaRequest $request): AnonymousResourceCollection
    {
        return LeituraResource::collection(($this->leiturasDoDia)($request->dia()));
    }
}
