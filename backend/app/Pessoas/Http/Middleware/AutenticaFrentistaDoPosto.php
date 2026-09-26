<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Middleware;

use App\Compartilhado\Posto;
use App\Pessoas\Application\VerificaTokenDoFrentista;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guard das rotas do PWA do frentista (#101): o token tem de ser de FRENTISTA e o frentista tem de
 * ser do `{posto}` da rota.
 *
 * - sem token, token inválido, vencido, de gerente ou de frentista desativado → 401;
 * - frentista de outro posto → 403 (o frentista do Jorro não envia no BR).
 *
 * Roda DEPOIS do `DefinePostoAtual`, que resolve o posto e o põe nos atributos. Deixa nos atributos
 * só o `frentista_id` (inteiro): quem consome é de outro módulo (Fechamento, Cadastro) e lê o
 * primitivo, sem conhecer classe de Pessoas (CA-7). É daqui, e nunca do corpo, que sai o frentista
 * de um envio — o frentista A não consegue lançar como o B.
 */
final readonly class AutenticaFrentistaDoPosto
{
    public function __construct(private VerificaTokenDoFrentista $verifica) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if ($token === null || $token === '') {
            abort(401, 'Token ausente.');
        }

        $sessao = ($this->verifica)($token) ?? abort(401, 'Token inválido.');

        $posto = $request->attributes->get('posto');
        abort_unless($posto instanceof Posto, 500, 'Guard fora de ordem: sem posto.');
        abort_unless($sessao['posto_id'] === $posto->id, 403, 'Frentista de outro posto.');

        $request->attributes->set('frentista_id', $sessao['frentista_id']);

        return $next($request);
    }
}
