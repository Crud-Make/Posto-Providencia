<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Controllers;

use App\Fechamento\Application\HistoricoParaOGerente;
use App\Fechamento\Http\Requests\FrentistaDoHistoricoRequest;
use App\Fechamento\Http\Resources\ItemDoHistoricoResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * `GET /api/postos/{posto}/equipe/{frentista}/historico` — o histórico recente de um frentista na
 * tela Frentistas do painel (#103). Mesmo item do histórico do PWA (`ItemDoHistoricoResource`);
 * frentista de outro posto é 404.
 */
final readonly class HistoricoDaEquipeController
{
    public function __construct(private HistoricoParaOGerente $historico) {}

    public function index(FrentistaDoHistoricoRequest $request): AnonymousResourceCollection
    {
        return ItemDoHistoricoResource::collection(($this->historico)($request->frentistaId()) ?? abort(404));
    }
}
