<?php

declare(strict_types=1);

namespace App\Providers;

use App\Compartilhado\Eventos\LeiturasDoDiaGravadas;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use App\Estoque\Application\DescontaLitrosVendidos;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Policies\PostoPolicy;
use App\Pessoas\Domain\TokenDeAcesso;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // um PostoAtual por requisição/job: definido pela rota, lido pelo trait PertenceAoPosto
        $this->app->scoped(PostoAtual::class);

        // O verificador recebe config, que não é autowirable. Sem SUPABASE_JWT_SECRET no .env ele
        // nasce com segredo vazio e recusa todo token — falha fechada, nunca aberta.
        $this->app->singleton(VerificaTokenDoSupabase::class, function (): VerificaTokenDoSupabase {
            $segredo = config('supabase.jwt_secret');
            $audiencia = config('supabase.jwt_audiencia');
            $folga = config('supabase.jwt_folga_segundos');

            // Estreitar, não castar: `config()` devolve mixed, e `(string) mixed` esconderia um
            // array mal configurado virando "Array". Tipo errado cai no padrão seguro.
            return new VerificaTokenDoSupabase(
                segredo: is_string($segredo) ? $segredo : '',
                audiencia: is_string($audiencia) ? $audiencia : 'authenticated',
                folgaSegundos: is_int($folga) ? $folga : 10,
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Posto::class, PostoPolicy::class);

        // Token do login da API (#102) com as colunas tipadas; o model do pacote não as declara.
        Sanctum::usePersonalAccessTokenModel(TokenDeAcesso::class);

        // Estoque reage a um dia gravado, sem que Fechamento o conheça: o evento mora em
        // Compartilhado e carrega só primitivos, então nenhum módulo depende do outro (CA-7).
        // O ouvinte é ShouldHandleEventsAfterCommit — desconto é consequência de um dia JÁ
        // gravado, nunca condição para gravá-lo. No painel a falha de estoque é console.warn e
        // o dia é salvo do mesmo jeito; aqui a fidelidade é essa.
        Event::listen(LeiturasDoDiaGravadas::class, DescontaLitrosVendidos::class);

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
