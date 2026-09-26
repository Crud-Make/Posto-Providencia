<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Compartilhado\Eventos\FrentistaDesativado;
use App\Pessoas\Domain\AcessoFrentista;

/**
 * Desativar um frentista derruba as sessões de PIN abertas dele (#103, tela Frentistas).
 *
 * O {@see VerificaTokenDoFrentista} já recusa o token de frentista inativo a cada requisição; apagar
 * os tokens aqui fecha a porta também para quando ele for REATIVADO: o token emitido antes do
 * desligamento não volta a valer, e ele entra de novo pelo PIN. O PIN em si fica — quem decide PIN é
 * o comando `frentista:pin` (a tela para o gerente é decisão pendente do dono).
 *
 * Ouvinte síncrono, dentro da transação de quem desativou: se apagar os tokens falhar, a desativação
 * volta atrás junto, e nunca fica um inativo com sessão viva.
 */
final readonly class DerrubaSessoesDoFrentista
{
    public function handle(FrentistaDesativado $evento): void
    {
        AcessoFrentista::query()->find($evento->frentistaId)?->tokens()->delete();
    }
}
