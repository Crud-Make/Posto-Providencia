<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\Leitura;
use Carbon\CarbonImmutable;

/**
 * Grava os encerrantes de um dia — só escrita, sem regra. Quem decide se o dia pode ser gravado
 * (janela, posto dos itens) é quem chama: {@see GravaFilhosDoDia}, no `PUT /fechamento` do gerente,
 * e {@see GravaLeiturasDoEncerrante}, no `PUT /leituras` do PWA do dono (#102).
 *
 * Saiu de `GravaFilhosDoDia::gravaLeituras` quando a segunda porta nasceu: as duas gravam a leitura
 * do MESMO jeito, e duas cópias do UPSERT seriam duas regras de "leitura-base sobrevive" para manter.
 *
 * @phpstan-import-type LeituraDeclarada from DiaDeclarado
 */
final readonly class GravaLeituras
{
    /**
     * UPSERT por `(bico_id, data)` — unique `leitura_unica_bico_data` (`01-esquema-base.sql:777`).
     *
     * NÃO apaga o dia inteiro antes: bico não declarado fica como está. É o que mata "salvar o dia
     * apaga a leitura-base" (memória `salvar-o-dia-apaga-leitura-base`), e muda a I5 de propósito.
     *
     * @param  list<LeituraDeclarada>  $leituras
     */
    public function __invoke(CarbonImmutable $dia, array $leituras, int $usuarioId, int $postoId): void
    {
        if ($leituras === []) {
            return;
        }

        // Offset explícito no valor: o UPSERT passa pelo query builder, sem cast, e o instante não
        // pode depender do fuso da sessão. `turno_id` fica NULL, como o painel sempre gravou
        // (`useSubmissaoFechamento.ts:153-162` nunca o envia).
        $instante = $dia->utc()->startOfDay()->format('Y-m-d H:i:sP');

        $linhas = array_map(static fn (array $leitura): array => [
            ...$leitura,
            'data' => $instante,
            'usuario_id' => $usuarioId,
            'posto_id' => $postoId,
        ], $leituras);

        Leitura::query()->upsert($linhas, ['bico_id', 'data'], [
            'combustivel_id', 'leitura_inicial', 'leitura_final', 'litros_vendidos', 'preco_litro',
            'valor_total', 'usuario_id',
        ]);
    }
}
