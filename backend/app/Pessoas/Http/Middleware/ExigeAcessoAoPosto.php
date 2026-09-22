<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Middleware;

use App\Compartilhado\Posto;
use App\Pessoas\Domain\Policies\PostoPolicy;
use App\Pessoas\Domain\Usuario;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

/**
 * Dá dente à {@see PostoPolicy}, que existia desde a #97 e que
 * nenhuma rota consultava: ADMIN vê tudo; os demais precisam de vínculo ativo em `UsuarioPosto`.
 *
 * Roda DEPOIS do `DefinePostoAtual` (que resolve `{posto}` e põe o model nos atributos da
 * requisição) e DEPOIS do {@see AutenticaPeloTokenAtual} (que põe o usuário). Lê o posto pelo
 * atributo, e não pelo container, para não depender do módulo Cadastro — nenhum módulo depende de
 * outro (Pest Arch, `direcaoPermitidaEntreModulos`).
 *
 * A habilidade vai por parâmetro do alias (#103 P11): `posto.acesso` continua sendo `ver` (as
 * rotas GET não mudam), e `posto.acesso:gerir` é o que a escrita exige — dá dente à
 * `PostoPolicy::gerir` (Admin, ou vínculo ativo com papel que gerencia). Sem lista branca: a policy
 * só tem `ver` e `gerir`, e habilidade inexistente cai em `allows === false` → 403.
 */
final readonly class ExigeAcessoAoPosto
{
    public function handle(Request $request, Closure $next, string $habilidade = 'ver'): Response
    {
        $usuario = $request->attributes->get('usuario');
        $posto = $request->attributes->get('posto');

        // Middleware fora de ordem é erro de rota, não requisição malformada: 500 e não 403, para
        // não mascarar o defeito de configuração como negativa de acesso.
        abort_unless($usuario instanceof Usuario, 500, 'Guard fora de ordem: sem usuário.');
        abort_unless($posto instanceof Posto, 500, 'Guard fora de ordem: sem posto.');

        abort_unless(Gate::forUser($usuario)->allows($habilidade, $posto), 403, 'Sem acesso a este posto.');

        return $next($request);
    }
}
