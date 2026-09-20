<?php

declare(strict_types=1);

use App\Compartilhado\PertenceAoPosto;
use App\Compartilhado\Posto;
use App\Fechamento\Domain\Recebimento;
use App\Models\User;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| Escopo de tenant — a trava que faltava para o multi-tenant
|--------------------------------------------------------------------------
| O sistema vai atender vários postos. Um model de negócio que esqueça o
| PertenceAoPosto não erra na hora: ele responde consulta SEM filtro de posto, e o
| dado de um cliente aparece na tela de outro. Deptrac, PHPStan 9, PHPMD e o Pest
| passam verdes nesse erro — nenhum deles sabe o que é tenant.
|
| A regra NÃO é uma lista escrita à mão: vem do banco. Tabela com coluna `posto_id`
| exige o trait. Model novo em tabela escopada entra já coberto, sem ninguém lembrar.
|
| Exceção só com motivo escrito, aqui embaixo. Lista vazia de exceção seria mentira:
| existe uma real.
*/

/**
 * Models que tocam tabela COM `posto_id` e mesmo assim não usam o trait.
 * Chave = classe; valor = por que a exceção existe. Mexer aqui exige justificar.
 *
 * @return array<class-string, string>
 */
function excecoesDeEscopo(): array
{
    return [
        UsuarioPosto::class => 'É a tabela que DECIDE o acesso: a PostoPolicy '
            .'consulta os vínculos do usuário para saber quais postos ele alcança. Escopá-la pelo '
            .'posto atual seria circular — só enxergaria o vínculo do posto que ela deveria autorizar.',
    ];
}

/**
 * Todo model do app, por varredura de arquivo — e não por lista, que envelhece calada.
 *
 * @return list<Model>
 */
function modelsDoApp(): array
{
    $raiz = dirname(__DIR__, 3).'/app';
    $modelos = [];

    /** @var iterable<SplFileInfo> $arquivos */
    $arquivos = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($raiz, FilesystemIterator::SKIP_DOTS));

    foreach ($arquivos as $arquivo) {
        if ($arquivo->getExtension() !== 'php') {
            continue;
        }

        $relativo = substr($arquivo->getPathname(), strlen($raiz) + 1);
        $classe = 'App\\'.str_replace(['/', '.php'], ['\\', ''], $relativo);

        if (! class_exists($classe)) {
            continue;
        }

        $reflexao = new ReflectionClass($classe);

        if ($reflexao->isAbstract() || ! $reflexao->isSubclassOf(Model::class)) {
            continue;
        }

        $modelos[] = $reflexao->newInstance();
    }

    usort($modelos, fn (Model $a, Model $b): int => $a::class <=> $b::class);

    return $modelos;
}

/**
 * Colunas `posto_id` como o banco as tem — a fonte da regra.
 *
 * @return list<string>
 */
function tabelasEscopadas(): array
{
    /** @var list<object{table_name: string}> $linhas */
    $linhas = DB::select(
        "select table_name from information_schema.columns
         where table_schema = 'public' and column_name = 'posto_id'"
    );

    return array_map(fn (object $l): string => $l->table_name, $linhas);
}

it('todo model em tabela com posto_id usa PertenceAoPosto', function (): void {
    $escopadas = tabelasEscopadas();
    $excecoes = excecoesDeEscopo();
    $desprotegidos = [];

    foreach (modelsDoApp() as $model) {
        if (! in_array($model->getTable(), $escopadas, true)) {
            continue;
        }

        if (array_key_exists($model::class, $excecoes)) {
            continue;
        }

        if (! in_array(PertenceAoPosto::class, class_uses_recursive($model), true)) {
            $desprotegidos[] = $model::class.' (tabela "'.$model->getTable().'")';
        }
    }

    expect($desprotegidos)->toBe([], implode("\n", [
        'Model em tabela com posto_id e SEM PertenceAoPosto: consulta sem filtro de tenant,',
        'dado de um posto visível para outro. Use o trait, ou registre a exceção COM MOTIVO',
        'em excecoesDeEscopo() deste arquivo.',
        ...$desprotegidos,
    ]));
});

it('toda exceção de escopo aponta para model real, em tabela escopada, e traz motivo', function (): void {
    // Exceção que envelhece é pior que exceção nenhuma: some a razão, fica a brecha.
    $escopadas = tabelasEscopadas();

    foreach (excecoesDeEscopo() as $classe => $motivo) {
        expect(class_exists($classe))->toBeTrue("Exceção aponta para classe inexistente: {$classe}");
        expect(mb_strlen($motivo))->toBeGreaterThan(40, "Exceção sem motivo escrito: {$classe}");

        $reflexao = new ReflectionClass($classe);

        // Lançar e não `expect`: o PHPStan estreita pelo throw, e exceção apontando para
        // não-model é defeito do próprio gate, não falha de arquitetura do app.
        if (! $reflexao->isSubclassOf(Model::class)) {
            throw new RuntimeException("Exceção de escopo aponta para classe que não é Model: {$classe}");
        }

        expect($reflexao->newInstance()->getTable())
            ->toBeIn($escopadas, "Exceção desnecessária: a tabela de {$classe} não tem posto_id");
    }
});

it('model em tabela SEM posto_id declara como é escopado', function (): void {
    // Sem isto, um model novo sem posto_id entra calado e ninguém decide se é tenant-raiz,
    // filho de outro escopado, ou um vazamento.
    $motivos = [
        Posto::class => 'É o próprio tenant.',
        Usuario::class => 'Atravessa tenants: o mesmo usuário serve vários postos pelo UsuarioPosto.',
        Recebimento::class => 'Escopado pelo pai: fechamento_id aponta para Fechamento, que é escopado.',
        User::class => 'Sobra do instalador do Laravel: sem $table, sem uso em app/, e a '
            .'tabela users nem existe no catálogo de produção. Não é model de negócio. Some quando a '
            .'#102 decidir o dono da autenticação; até lá fica declarado para não passar calado.',
    ];

    $escopadas = tabelasEscopadas();
    $semDeclaracao = [];

    foreach (modelsDoApp() as $model) {
        if (in_array($model->getTable(), $escopadas, true)) {
            continue;
        }

        if (! array_key_exists($model::class, $motivos)) {
            $semDeclaracao[] = $model::class.' (tabela "'.$model->getTable().'")';
        }
    }

    expect($semDeclaracao)->toBe([], 'Model sem posto_id e sem motivo declarado: '.implode(', ', $semDeclaracao));
});
