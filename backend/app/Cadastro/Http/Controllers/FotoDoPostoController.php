<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Controllers;

use App\Cadastro\Application\FotoDoPosto;
use App\Cadastro\Http\Requests\TrocaFotoDoPostoRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * A foto da fachada do posto (decisão do dono, 27/09/2026). Trocar é do gerente/admin do posto;
 * ver é público (a tela de entrada e a escolha do PWA vêm antes de qualquer login).
 */
final readonly class FotoDoPostoController
{
    public function __construct(private FotoDoPosto $fotos) {}

    /** `PUT /api/postos/{posto}/foto` — 200 `{ data: { foto: caminho | null } }`. */
    public function troca(TrocaFotoDoPostoRequest $request): JsonResponse
    {
        return response()->json(['data' => ['foto' => $this->fotos->troca($request->postoId(), $request->foto())]]);
    }

    /**
     * `GET /api/postos/{posto}/foto?v=…` — os bytes do JPEG. A URL muda a cada troca (`v`), então o
     * cache é eterno. Sem foto, posto inativo ou inexistente: 404.
     */
    public function mostra(int $posto): Response
    {
        $jpeg = $this->fotos->jpeg($posto) ?? abort(404, 'Posto sem foto.');

        return response($jpeg, 200, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
