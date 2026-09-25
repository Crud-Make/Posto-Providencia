<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Pessoas\Domain\AcessoFrentista;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Confere o PIN do frentista e emite o token curto do PWA (#101, docs/design/fechamento-frentista-api.md §4).
 *
 * Qualquer falha devolve `null`, sem dizer qual: frentista inexistente, de outro posto, inativo,
 * sem PIN definido ou PIN errado são a mesma resposta para quem está do lado de fora. O hash é
 * conferido mesmo quando não há PIN, contra um hash descartável, para o tempo de resposta não
 * entregar quais frentistas têm acesso.
 *
 * O token vence em {@see self::HORAS_DO_TURNO} horas — o PIN é pedido a cada turno (decisão do dono,
 * 19/09/2026) — e carrega só a ability de frentista: não abre rota de gerente, e o token do gerente
 * não abre rota de frentista (os dois middlewares conferem o dono do token).
 */
final readonly class EntrarComoFrentista
{
    /** Um turno longo com folga; depois disso o PIN é pedido de novo. */
    public const int HORAS_DO_TURNO = 14;

    /** Hash bcrypt de um segredo aleatório: só existe para gastar o mesmo tempo de um `check` real. */
    private const string HASH_DESCARTAVEL = '$2y$12$Py5T56CgnidKkTFnvg310.vwXPVsRb4nmtMMb8M0kdSBLZjIvP0vu';

    /** @return array{token: string, vence_em: CarbonImmutable, frentista: array{id: int, nome: string}}|null */
    public function __invoke(int $postoId, int $frentistaId, string $pin): ?array
    {
        $nome = DB::table('Frentista')
            ->where('id', $frentistaId)
            ->where('posto_id', $postoId)
            ->where('ativo', true)
            ->value('nome');

        $acesso = is_string($nome) ? AcessoFrentista::query()->find($frentistaId) : null;
        $confere = Hash::check($pin, $acesso->pin_hash ?? self::HASH_DESCARTAVEL);

        if (! is_string($nome) || $acesso === null || ! $confere) {
            return null;
        }

        $vence = CarbonImmutable::now()->addHours(self::HORAS_DO_TURNO);
        // Faxina: token vencido deste frentista não serve para nada e só incha a tabela.
        $acesso->tokens()->where('expires_at', '<', now())->delete();

        return [
            'token' => $acesso->createToken('pwa-frentista', [AcessoFrentista::ABILITY], $vence)->plainTextToken,
            'vence_em' => $vence,
            'frentista' => ['id' => $frentistaId, 'nome' => $nome],
        ];
    }
}
