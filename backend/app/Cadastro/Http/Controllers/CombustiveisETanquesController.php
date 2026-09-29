<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Controllers;

use App\Cadastro\Application\CombustiveisDoPosto;
use App\Cadastro\Application\TanquesDoPosto;
use App\Cadastro\Http\Requests\CombustivelDoPainelRequest;
use App\Cadastro\Http\Requests\TanqueDoPainelRequest;
use App\Cadastro\Http\Resources\RespostaDoCadastro;
use Illuminate\Http\JsonResponse;

/**
 * Cadastro de combustíveis e tanques do painel pela API (#157). O posto vem da rota
 * (`DefinePostoAtual`), nunca do corpo; combustível ou tanque de outro posto é 404; recusa de
 * regra é 422 `{ erro: { codigo, mensagem } }`.
 */
final readonly class CombustiveisETanquesController
{
    public function __construct(
        private CombustiveisDoPosto $combustiveis,
        private TanquesDoPosto $tanques,
    ) {}

    /** `POST /api/postos/{posto}/combustiveis` — 201 com o combustível criado. */
    public function criaCombustivel(CombustivelDoPainelRequest $request): JsonResponse
    {
        return RespostaDoCadastro::de($this->combustiveis->cadastrar($request->combustivel()), 201);
    }

    /** `PUT /api/postos/{posto}/combustiveis/{combustivel}` — desativar é `ativo: false`. */
    public function editaCombustivel(CombustivelDoPainelRequest $request): JsonResponse
    {
        return RespostaDoCadastro::de($this->combustiveis->editar($request->combustivelId(), $request->combustivel()) ?? abort(404), 200);
    }

    /** `POST /api/postos/{posto}/tanques` — 201 com o tanque criado (estoque 0). */
    public function criaTanque(TanqueDoPainelRequest $request): JsonResponse
    {
        return RespostaDoCadastro::de($this->tanques->cadastrar($request->tanque()), 201);
    }

    /** `PUT /api/postos/{posto}/tanques/{tanque}` — nunca mexe no estoque. */
    public function editaTanque(TanqueDoPainelRequest $request): JsonResponse
    {
        return RespostaDoCadastro::de($this->tanques->editar($request->tanqueId(), $request->tanque()) ?? abort(404), 200);
    }
}
