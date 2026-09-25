<?php

declare(strict_types=1);

namespace App\Compartilhado;

use Carbon\CarbonImmutable;

/**
 * A janela de escrita do banco, como data pura — cópia LITERAL de `dentro_da_janela_de_escrita` e
 * `dentro_da_janela_de_edicao` (banco/init/01-esquema-base.sql:1110-1128, hoje idênticas):
 *
 *     quando >= DATE '2025-12-31' AND quando < (CURRENT_DATE + INTERVAL '2 days')
 *
 * Mora em Compartilhado porque DOIS módulos a aplicam: Fechamento (o dia do caixa,
 * `Fechamento\Domain\JanelaDeEscrita`, que delega para cá) e Estoque (a medição de régua
 * do PWA, #101 fatia 2 — policies `historico_tanque_insert_janela`/`_update_janela`). Nenhum módulo
 * depende de outro (CA-7), então a regra comum desce para a camada de baixo. A RECUSA (texto e
 * código) continua em cada módulo.
 *
 * O Laravel conecta como superuser: para ele a RLS não existe, e esta checagem é a única trava.
 */
final readonly class JanelaDoBanco
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
}
