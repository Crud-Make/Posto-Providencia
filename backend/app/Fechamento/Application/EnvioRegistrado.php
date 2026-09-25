<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\ConsolidacaoDoDia;
use App\Fechamento\Domain\FechamentoFrentista;

/**
 * O envio gravado — ou reconhecido como repetição de um já gravado (mesma chave, mesmo conteúdo).
 *
 * `consolidacao` é o que ficou no pai depois DESTE envio; numa repetição é `null`, porque nada foi
 * gravado de novo.
 */
final readonly class EnvioRegistrado
{
    public function __construct(
        public FechamentoFrentista $linha,
        public bool $repetido,
        public ?ConsolidacaoDoDia $consolidacao,
    ) {}
}
