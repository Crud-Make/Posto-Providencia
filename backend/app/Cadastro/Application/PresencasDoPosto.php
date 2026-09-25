<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\PresencaFrentista;
use Illuminate\Database\Eloquent\Collection;

/**
 * Quem deu sinal de vida no posto atual, com nome e foto do frentista. O recorte de "quem conta
 * como presente" (janela de minutos) é do cliente (`presencasRelevantes`, @posto/utils), como hoje.
 */
final readonly class PresencasDoPosto
{
    /** @return Collection<int, PresencaFrentista> */
    public function __invoke(): Collection
    {
        return PresencaFrentista::query()->with('frentista')->orderByDesc('visto_em')->get();
    }
}
