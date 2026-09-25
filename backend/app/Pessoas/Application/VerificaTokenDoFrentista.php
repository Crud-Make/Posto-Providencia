<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Pessoas\Domain\AcessoFrentista;
use App\Pessoas\Domain\TokenDeAcesso;
use Illuminate\Support\Facades\DB;

/**
 * Resolve o token de frentista (emitido por {@see EntrarComoFrentista}) no frentista e no posto dele.
 *
 * Devolve `null` para token desconhecido, vencido, sem vencimento, sem a ability de frentista, de
 * dono que não é {@see AcessoFrentista} (o token do gerente tem ability `*`, que "pode tudo" — por
 * isso o dono é conferido pela classe, não só pela ability) ou de frentista desativado ou apagado:
 * desligar alguém corta o acesso na hora, sem esperar o token vencer.
 *
 * O posto é lido do cadastro a cada requisição, e não guardado no token: frentista transferido de
 * posto passa a enviar só para o novo.
 */
final readonly class VerificaTokenDoFrentista
{
    /** @return array{frentista_id: int, posto_id: int}|null */
    public function __invoke(string $token): ?array
    {
        $acesso = TokenDeAcesso::findToken($token);

        if (! $acesso instanceof TokenDeAcesso || ! $this->valeParaFrentista($acesso)) {
            return null;
        }

        $postoId = DB::table('Frentista')
            ->where('id', $acesso->tokenable_id)
            ->where('ativo', true)
            ->value('posto_id');

        if (! is_int($postoId)) {
            return null;
        }

        $acesso->forceFill(['last_used_at' => now()])->save();

        return ['frentista_id' => $acesso->tokenable_id, 'posto_id' => $postoId];
    }

    private function valeParaFrentista(TokenDeAcesso $acesso): bool
    {
        return $acesso->tokenable_type === (new AcessoFrentista)->getMorphClass()
            && $acesso->expires_at !== null
            && $acesso->expires_at->isFuture()
            && $acesso->can(AcessoFrentista::ABILITY);
    }
}
