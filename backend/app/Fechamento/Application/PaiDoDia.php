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
 * o do posto, com `data` = 00:00Z do dia e o turno DO PRÓPRIO POSTO ({@see Fechamento::turnoDoPosto()} — o frentista
 * não escolhe turno; até 30/09/2026 era o turno 1 cravado, que é do Jorro, e o dia do Posto BR nascia
 * apontando para ele). Nasce `ABERTO`, com `total_vendas` e `diferenca` NULL ("não apurado") e
 * `total_recebido` 0, e `usuario_id` 1 até o gerente fechar o dia ({@see GravaFechamentoDoDia} grava
 * quem fechou): o frentista não é `Usuario` e a coluna é NOT NULL.
 *
 * O dia é achado pelo POSTO e pela data, sem o turno: o dia que nasceu no turno errado antes da
 * correção continua sendo o mesmo dia, em vez de ganhar um segundo pai.
 *
 * A criação é `INSERT … ON CONFLICT DO NOTHING` seguida de releitura: dois frentistas enviando o
 * primeiro turno do dia ao mesmo tempo não viram 500 no unique `(data, turno_id)`.
 */
final readonly class PaiDoDia
{
    /** `usuarioId = 1` padrão de `buscarOuCriarFechamento`: o frentista não é `Usuario`. */
    public const int USUARIO_DO_PWA = 1;

    public function __invoke(CarbonImmutable $dia, int $postoId): Fechamento
    {
        $instante = $dia->utc()->startOfDay()->format('Y-m-d H:i:sP');

        $pai = $this->travado($instante, $postoId);
        if ($pai !== null) {
            return $pai;
        }

        Fechamento::query()->insertOrIgnore([
            'data' => $instante,
            'posto_id' => $postoId,
            'turno_id' => Fechamento::turnoDoPosto($postoId),
            'status' => StatusFechamento::Aberto->value,
            'usuario_id' => self::USUARIO_DO_PWA,
            'total_vendas' => null,
            'total_recebido' => '0.00',
            'diferenca' => null,
        ]);

        // Ainda sem pai deste posto: só acontece se o unique não tiver `posto_id` (esquema anterior à
        // migration multi-tenant da #93, 02-multi-tenant-uniques-por-posto.sql).
        return $this->travado($instante, $postoId)
            ?? throw new RuntimeException('O Fechamento deste dia não pôde ser criado neste posto (unique sem posto_id, #93).');
    }

    private function travado(string $instante, int $postoId): ?Fechamento
    {
        return Fechamento::query()
            ->where('data', $instante)
            ->where('posto_id', $postoId)
            ->orderBy('id')
            ->lockForUpdate()
            ->first();
    }
}
