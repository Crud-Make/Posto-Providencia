<?php

declare(strict_types=1);

namespace App\Fechamento\Domain;

use Carbon\CarbonImmutable;

/**
 * A janela em que um dia ainda pode ser gravado.
 *
 * Cópia LITERAL de `dentro_da_janela_de_escrita(quando)` do banco
 * (banco/init/01-esquema-base.sql:1120-1128):
 *
 *     quando >= DATE '2025-12-31' AND quando < (CURRENT_DATE + INTERVAL '2 days')
 *
 * Por que existe em PHP se já existe em SQL: a função do banco é aplicada pela RLS, e a RLS só
 * vale para o papel `anon`/`authenticated` do Supabase. O Laravel conecta como `posto`, que é
 * **superuser** (`rolsuper = t`, medido no compose em 20/09/2026) — para ele a RLS não existe.
 * Quando a escrita passa pelo Laravel, este VO é a ÚNICA trava que sobra.
 *
 * O "hoje" entra por parâmetro, em UTC, para o teste fixar a data: `CURRENT_DATE` no banco é
 * o dia da sessão, e aqui o dia é o dia UTC (invariante I9). Medido no compose: 2026-01-05 é
 * ACEITO com hoje = 2026-09-20 — só o futuro (hoje + 2 dias em diante) é barrado.
 */
final readonly class JanelaDeEscrita
{
    /** Primeiro dia que aceita escrita: a leitura de abertura de 31/12/2025. */
    public const string INICIO = '2025-12-31';

    /** `CURRENT_DATE + INTERVAL '2 days'` é exclusivo: hoje e amanhã entram, depois não. */
    public const int DIAS_A_FRENTE = 2;

    /** @param  ?CarbonImmutable  $hojeUtc  o "hoje"; sem ele, o relógio em UTC — o teste fixa, o Command não */
    public static function aceita(CarbonImmutable $dia, ?CarbonImmutable $hojeUtc = null): bool
    {
        $diaUtc = $dia->utc()->startOfDay();
        $inicio = new CarbonImmutable(self::INICIO.' 00:00:00', 'UTC');
        $hoje = $hojeUtc ?? CarbonImmutable::now('UTC');
        $limite = $hoje->utc()->startOfDay()->addDays(self::DIAS_A_FRENTE);

        return $diaUtc->greaterThanOrEqualTo($inicio) && $diaUtc->lessThan($limite);
    }

    public static function recusa(CarbonImmutable $dia): RecusaDaGravacao
    {
        return new RecusaDaGravacao(
            'fora_da_janela',
            'O dia '.$dia->utc()->format('d/m/Y').' está fora da janela de escrita '
                .'(de 31/12/2025 até amanhã).',
        );
    }
}
