<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\PresencaFrentista;
use App\Compartilhado\PostoAtual;
use RuntimeException;

/**
 * Sinal de vida do frentista autenticado (#101): "o app está aberto com este frentista".
 *
 * Porte de `marcarPresencaDoFrentista` do PWA — um UPSERT por `frentista_id` com o posto, e
 * `visto_em` NÃO vai: o trigger `carimba_visto_em` (01-esquema-base.sql) põe a hora do SERVIDOR no
 * INSERT e no UPDATE. Celular com o relógio errado não põe ninguém no futuro.
 */
final readonly class MarcaPresenca
{
    public function __construct(private PostoAtual $postoAtual) {}

    public function __invoke(int $frentistaId): void
    {
        $postoId = $this->postoAtual->id()
            ?? throw new RuntimeException('MarcaPresenca exige PostoAtual definido.');

        PresencaFrentista::query()->upsert(
            [['frentista_id' => $frentistaId, 'posto_id' => $postoId]],
            ['frentista_id'],
            ['posto_id'],
        );
    }
}
