<?php

declare(strict_types=1);

namespace App\Compartilhado\Eventos;

/**
 * As leituras de um dia foram gravadas. Fato consumado, no passado — não é ordem.
 *
 * **Mora em `Compartilhado` de propósito.** Se nascesse em `Fechamento`, quem o escuta passaria
 * a depender de `Fechamento`, e nenhum módulo depende de outro (CA-7, Pest Arch). Aqui os dois
 * lados apontam para o mesmo contrato e nenhum conhece o outro.
 *
 * Carrega **só primitivos**, pela mesma razão: `Compartilhado` não alcança `Domain` (Deptrac), e
 * um evento que carregasse model amarraria o ouvinte ao esquema de quem emitiu.
 */
final readonly class LeiturasDoDiaGravadas
{
    /**
     * @param  int  $postoId  o tenant a que o dia pertence
     * @param  string  $dia  AAAA-MM-DD, o dia em UTC
     * @param  array<int, string>  $litrosPorCombustivel  `combustivel_id` => litros em string
     *                                                    decimal. String, e não float, porque é
     *                                                    volume que vira estoque: quem converter
     *                                                    para float perde casa na soma.
     */
    public function __construct(
        public int $postoId,
        public string $dia,
        public array $litrosPorCombustivel,
    ) {}
}
