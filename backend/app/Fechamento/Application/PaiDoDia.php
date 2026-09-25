<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Compartilhado\Enums\StatusFechamento;
use App\Fechamento\Domain\Fechamento;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * O `Fechamento` do dia em que o envio do frentista cai — achado ou criado, e TRAVADO (`FOR UPDATE`)
 * até o fim da transação de quem chama.
 *
 * Porte de `buscarOuCriarFechamento` (`pwa-frentista/src/entities/fechamento-frentista/api`): o pai é
 * o do posto, com `data` = 00:00Z do dia e `turno_id` = 1 (o turno canônico do PWA — o frentista não
 * escolhe turno). Nasce `ABERTO`, com `total_vendas` e `diferenca` NULL ("não apurado") e
 * `total_recebido` 0, e `usuario_id` 1 — o mesmo padrão que o PWA grava hoje (o frentista não é
 * `Usuario`).
 *
 * A criação é `INSERT … ON CONFLICT DO NOTHING` seguida de releitura: dois frentistas enviando o
 * primeiro turno do dia ao mesmo tempo não viram 500 no unique `(data, turno_id)`.
 */
final readonly class PaiDoDia
{
    /** `TURNO_CANONICO` do PWA (`shared/config`): todo envio do dia cai nele. */
    public const int TURNO_CANONICO = 1;

    /** `usuarioId = 1` padrão de `buscarOuCriarFechamento`: o frentista não é `Usuario`. */
    public const int USUARIO_DO_PWA = 1;

    public function __invoke(CarbonImmutable $dia, int $postoId): Fechamento
    {
        $instante = $dia->utc()->startOfDay()->format('Y-m-d H:i:sP');

        $pai = $this->travado($instante);
        if ($pai !== null) {
            return $pai;
        }

        Fechamento::query()->insertOrIgnore([
            'data' => $instante,
            'posto_id' => $postoId,
            'turno_id' => self::TURNO_CANONICO,
            'status' => StatusFechamento::Aberto->value,
            'usuario_id' => self::USUARIO_DO_PWA,
            'total_vendas' => null,
            'total_recebido' => '0.00',
            'diferenca' => null,
        ]);

        // Ainda sem pai deste posto: o `(data, turno_id)` já é de OUTRO posto. O unique de produção
        // não tem `posto_id` (01-esquema-base.sql:757) — a migration multi-tenant da #93 é que resolve.
        return $this->travado($instante)
            ?? throw new RuntimeException('O Fechamento deste dia e turno já existe em outro posto (unique sem posto_id, #93).');
    }

    private function travado(string $instante): ?Fechamento
    {
        return Fechamento::query()
            ->where('data', $instante)
            ->where('turno_id', self::TURNO_CANONICO)
            ->orderBy('id')
            ->lockForUpdate()
            ->first();
    }
}
