<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Controllers;

use App\Cadastro\Application\PostosDaRede;
use App\Cadastro\Http\Resources\PostoParaEscolherResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * A escolha do posto no PWA do frentista (#101, 26/09/2026). Sem entrada: não há FormRequest.
 */
final readonly class PostoDoPwaController
{
    public function __construct(private PostosDaRede $postos) {}

    /** `GET /api/postos` — pública (a escolha do posto vem antes do PIN). */
    public function index(): AnonymousResourceCollection
    {
        return PostoParaEscolherResource::collection($this->postos->ativos());
    }
}
