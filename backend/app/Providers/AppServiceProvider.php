<?php

namespace App\Providers;

use App\Cadastro\Domain\Policies\PostoPolicy;
use App\Cadastro\Domain\Posto;
use App\Compartilhado\PostoAtual;
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
    }
}
