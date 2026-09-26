<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Compartilhado\JanelaDoBanco;
use App\Estoque\Domain\MedicaoDeTanque;
use App\Estoque\Domain\RecusaDoEstoque;
use Carbon\CarbonImmutable;

/**
 * Grava a medição de régua de um tanque num dia (#101, fatia 2) — o porte de `salvarMedicao` do PWA:
 * UPSERT por `(tanque_id, data)`, medir de novo no mesmo dia SUBSTITUI o `volume_fisico` (o
 * `volume_livro` não é tocado, como no upsert do PWA). Idempotente por natureza: o mesmo pedido duas
 * vezes deixa a mesma linha.
 *
 * As travas que no Supabase eram policy (e que o Laravel, superuser, não herda):
 * - janela de escrita (`historico_tanque_insert_janela`/`_update_janela`) → `fora_da_janela` (422);
 * - o tanque tem de ser DESTE posto → `tanque_invalido` (422). No Supabase não havia trava de posto;
 * - `volume_fisico >= 0` e dentro de `numeric(10,2)` → FormRequest (422 de forma).
 *
 * Devolve a linha RELIDA do banco: o PWA confere o volume gravado contra o digitado, como já fazia
 * com a releitura anti-RLS.
 */
final readonly class GravaMedicaoDeTanque
{
    public function __construct(private ReguaDoPosto $regua) {}

    /** @param  numeric-string  $volumeFisico */
    public function __invoke(int $tanqueId, CarbonImmutable $dia, string $volumeFisico): MedicaoDeTanque|RecusaDoEstoque
    {
        if (! JanelaDoBanco::aceita($dia)) {
            return new RecusaDoEstoque(
                'fora_da_janela',
                'O dia '.$dia->utc()->format('d/m/Y').' está fora da janela de escrita (de 31/12/2025 até amanhã).',
            );
        }

        if (! $this->regua->tanqueEhDoPosto($tanqueId)) {
            return new RecusaDoEstoque('tanque_invalido', 'Tanque '.$tanqueId.' não é deste posto.');
        }

        $data = $dia->utc()->format('Y-m-d');
        MedicaoDeTanque::query()->upsert(
            [['tanque_id' => $tanqueId, 'data' => $data, 'volume_fisico' => $volumeFisico]],
            ['tanque_id', 'data'],
            ['volume_fisico'],
        );

        return MedicaoDeTanque::query()->where('tanque_id', $tanqueId)->where('data', $data)->firstOrFail();
    }
}
