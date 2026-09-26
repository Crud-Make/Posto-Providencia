<?php

declare(strict_types=1);

namespace App\Providers;

use App\Compartilhado\Eventos\FrentistaDesativado;
use App\Pessoas\Application\DerrubaSessoesDoFrentista;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

/**
 * Ouvintes da gestão de equipe (tela Frentistas, #103). Separado do AppServiceProvider para ele não
 * passar do teto de acoplamento do PHPMD (13), como o {@see LimitesDeTaxaServiceProvider}.
 */
final class OuvintesDaEquipeServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Pessoas derruba as sessões de PIN de quem o Cadastro desativou. Síncrono e dentro da
        // transação de quem desativou: inativo com sessão viva não existe. O evento mora em
        // Compartilhado e carrega só primitivos — nenhum módulo conhece o outro (CA-7).
        Event::listen(FrentistaDesativado::class, DerrubaSessoesDoFrentista::class);
    }
}
