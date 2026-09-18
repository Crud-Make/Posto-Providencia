<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Middleware;

use App\Cadastro\Domain\Posto;
use App\Compartilhado\PostoAtual;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolve `{posto}` da rota: 404 se não existe, senão vira o {@see PostoAtual} da requisição.
 * A partir daqui todo model com `PertenceAoPosto` só enxerga esse posto.
 */
final class DefinePostoAtual
{
    public function __construct(private readonly PostoAtual $postoAtual) {}

    public function handle(Request $request, Closure $next): Response
    {
        $id = (int) $request->route('posto');
        $posto = $id > 0 ? Posto::query()->find($id) : null;

        abort_if($posto === null, 404, 'Posto não encontrado.');

        $this->postoAtual->definir($posto->id);
        $request->attributes->set('posto', $posto);

        return $next($request);
    }
}
