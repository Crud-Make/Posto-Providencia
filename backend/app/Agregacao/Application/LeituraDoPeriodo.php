<?php

declare(strict_types=1);

namespace App\Agregacao\Application;

/**
 * Uma linha de `Leitura` do período, crua: o bico, o dia (em UTC) e os dois encerrantes.
 *
 * Existe para o cliente rodar `encerranteMensal` (`packages/utils/src/encerrante-mensal.ts`) sobre
 * os litros do rateio — decisão do dono em 22/09/2026 (#103 P9, Q1 opção a): o salto do encerrante
 * NÃO é reescrito aqui, porque seria uma segunda cópia da regra (DECISÃO 1, "o backend não
 * calcula"). Aqui só se lê e se devolve a linha como o Postgres a guarda.
 *
 * Os encerrantes são string decimal de escala 3, como o PDO entrega `numeric` — nunca float.
 */
final readonly class LeituraDoPeriodo
{
    public function __construct(
        public int $bicoId,
        /** Dia da leitura em UTC, `Y-m-d` (a coluna é `timestamptz` gravada em 00:00 UTC). */
        public string $data,
        /** `Leitura.leitura_inicial`, escala 3. */
        public string $leituraInicial,
        /** `Leitura.leitura_final`, escala 3. */
        public string $leituraFinal,
    ) {}
}
