<?php

declare(strict_types=1);

namespace App\Compartilhado\Eventos;

/**
 * Um frentista passou a inativo pela gestão de equipe do painel (#103, tela Frentistas). Fato
 * consumado, no passado — não é ordem.
 *
 * Mora em `Compartilhado` pelo mesmo motivo de {@see LeiturasDoDiaGravadas}: quem emite é Cadastro
 * (dono do "Frentista") e quem reage é Pessoas (dono do PIN e do token), e nenhum módulo depende de
 * outro (CA-7). Carrega só primitivos.
 */
final readonly class FrentistaDesativado
{
    public function __construct(
        public int $postoId,
        public int $frentistaId,
    ) {}
}
