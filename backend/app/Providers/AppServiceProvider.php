<?php

declare(strict_types=1);

namespace App\Providers;

use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use App\Pessoas\Domain\Policies\PostoPolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // um PostoAtual por requisição/job: definido pela rota, lido pelo trait PertenceAoPosto
        $this->app->scoped(PostoAtual::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Posto::class, PostoPolicy::class);

        // Travas do Eloquent: em dev, teste e CI o erro silencioso vira exceção.
        //  - lazy loading: N+1 que em produção é lentidão calada;
        //  - atributo ausente: coluna fora do select lida como null — num campo de valor,
        //    isso é R$ 0,00 que ninguém digitou;
        //  - atributo descartado: campo fora do $fillable some do INSERT sem aviso.
        // Desligadas em produção de propósito: lá, uma coluna esquecida viraria erro 500 na
        // tela do frentista. Os testes e o CI é que têm de pegar antes.
        // Canários: tests/Feature/TravasDoEloquentTest.php.
        $foraDeProducao = ! $this->app->isProduction();
        Model::preventLazyLoading($foraDeProducao);
        Model::preventAccessingMissingAttributes($foraDeProducao);
        Model::preventSilentlyDiscardingAttributes($foraDeProducao);
    }
}
