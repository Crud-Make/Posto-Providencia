<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Travas de arquitetura (Pest Arch)
|--------------------------------------------------------------------------
| Lê o código de app/ e reprova a suíte quando uma regra é quebrada. Complementa o Deptrac
| (deptrac.yaml), que cuida da DIREÇÃO entre camadas Http → Application → Domain →
| Compartilhado; aqui ficam as regras que o Deptrac não expressa: higiene, strict_types,
| forma dos controllers e dos enums.
|
| O layout é modular (Design Doc docs/design/fase-a-laravel.md §2): App\<Modulo>\{Http,
| Application,Domain}. Por isso os namespaces de controller e de domínio são descobertos no
| disco em vez de escritos à mão — módulo novo entra na regra sem ninguém lembrar.
|
| SÓ a forma encadeada `arch('…')->expect(…)`. A forma com closure `arch('…', fn () =>
| expect(…))` passa VERDE com a violação dentro — a mutação de 18/09 plantou um dd() e ela não
| acusou (os testes saem "risky", sem asserção). O PHPStan não enxerga o proxy da forma
| encadeada; por isso tests/Arch está em excludePaths do phpstan.neon.
|
| Canário: .claude/hooks/testa-hooks.py grava um dd() em app/ e exige que o hook reprove; e
| cada regra foi conferida por mutação em 18/09/2026 (violação plantada → teste vermelho).
*/

/** @return list<string> namespaces App\<Modulo>\<sufixo> que existem hoje em app/ */
function namespacesDosModulos(string $sufixo): array
{
    $pastas = glob(__DIR__.'/../../app/*/'.str_replace('\\', '/', $sufixo), GLOB_ONLYDIR);

    return array_map(
        static fn (string $pasta): string => 'App\\'.basename(dirname($pasta, substr_count($sufixo, '\\') + 1)).'\\'.$sufixo,
        $pastas === false ? [] : $pastas,
    );
}

/** @return list<string> nomes dos módulos App\<Modulo> que existem hoje em app/ (têm Http, Application ou Domain) */
function modulos(): array
{
    $nomes = [];
    foreach (['Http', 'Application', 'Domain'] as $camada) {
        foreach (namespacesDosModulos($camada) as $namespace) {
            $nomes[] = explode('\\', $namespace)[1];
        }
    }

    return array_values(array_unique($nomes));
}

/**
 * Direção permitida ENTRE módulos. Chave = módulo; valor = de quem ele pode depender. Módulo fora
 * do mapa (ou com lista vazia) não pode depender de nenhum outro.
 *
 * Hoje NENHUM módulo depende de outro: o Posto, raiz do tenant, mora em App\Compartilhado, e
 * Cadastro e Pessoas apontam para ele, não um para o outro. A exceção prevista no Design Doc
 * (docs/design/fase-a-laravel.md §2: "Fechamento pode depender de Cadastro; ninguém depende de
 * Fechamento exceto Notificacao; ciclo = PR rejeitado") entra aqui só quando o módulo Fechamento
 * nascer, e restrita a App\Fechamento → App\Cadastro\Application — a forma atual do teste (toUse
 * por módulo inteiro) não distingue camada, então essa linha vai exigir regra própria.
 *
 * O Deptrac não cobre isto: ele junta o Domain de TODOS os módulos numa camada só (deptrac.yaml,
 * camada Domain), então o ciclo Cadastro\Domain ↔ Pessoas\Domain passou lá com 0 violações. Módulo
 * novo entra com a linha dele aqui, senão a regra barra qualquer dependência dele.
 *
 * @return array<string, list<string>>
 */
function direcaoPermitidaEntreModulos(): array
{
    return [
        // Agregação lê tabela com query builder, não model de módulo (agregacao.md §2, CA-7).
        // Canário 18/09/2026: `use App\Cadastro\Domain\Combustivel` com uso real em
        // DadosDoPeriodo deixou só a regra de Agregacao vermelha.
        'Agregacao' => [],
        'Cadastro' => [],
        // Fechamento nasceu em 18/09/2026 (docs/design/fechamento-diario-api.md §2) SEM a
        // abertura para Cadastro que o comentário acima previa: o catálogo chega ao cliente
        // pelas rotas da #97 e coluna de tabela alheia se lê com query builder (CA-7, sem
        // exceção). Canário 18/09/2026: `use App\Cadastro\Domain\Bico` com uso real em
        // Fechamento\Domain\Leitura deixou só a regra de Fechamento vermelha; removido, verde.
        'Fechamento' => [],
        'Pessoas' => [],
        // Estoque ouve LeiturasDoDiaGravadas, que mora em Compartilhado: não conhece Fechamento.
        'Estoque' => [],
        // Compras (#103, Registro de Compras) soma no Estoque e no Tanque e grava a régua por query
        // builder: não conhece App\Estoque nem App\Cadastro (CA-7).
        'Compras' => [],
    ];
}

arch('todo arquivo de app/ declara strict_types')->expect('App')
    ->toUseStrictTypes();

// Uma regra POR módulo (ver nota sobre `expect([lista])` abaixo). Canário conferido em 18/09/2026:
// com PostoPolicy e Posto::usuarios() ainda dentro de Cadastro importando Pessoas, a regra de
// Cadastro ficou vermelha apontando os dois arquivos; quebrado o ciclo, verde. A de Pessoas
// (mapa vazio) também: um `use App\Cadastro\Domain\Bico` com uso real plantado em
// Pessoas\Domain\Policies\PostoPolicy deixou só esta regra vermelha — o Deptrac ficou calado,
// porque para ele Domain de qualquer módulo é uma camada só.
foreach (modulos() as $modulo) {
    $permitidos = direcaoPermitidaEntreModulos()[$modulo] ?? [];
    $proibidos = array_values(array_diff(modulos(), [$modulo], $permitidos));

    if ($proibidos === []) {
        continue;
    }

    arch("App\\{$modulo}: não depende de outro módulo".($permitidos === [] ? '' : ' além de '.implode(', ', $permitidos)))
        ->expect("App\\{$modulo}")
        ->not->toUse(array_map(static fn (string $outro): string => "App\\{$outro}", $proibidos));
}

// Compartilhado não é módulo (não tem Http/Application/Domain), então o laço acima não o cobre.
// É a camada mais baixa: pode ser usado por todo módulo e não usa nenhum. Canário: um `use
// App\Cadastro\Domain\Bico` plantado em PostoAtual.php deixa esta regra vermelha.
arch('App\\Compartilhado: camada mais baixa, não depende de nenhum módulo')
    ->expect('App\\Compartilhado')
    ->not->toUse(array_map(static fn (string $modulo): string => "App\\{$modulo}", modulos()));

// O deptrac.yaml deixa Compartilhado conhecer Factories (o Posto conhece a própria factory, via
// newFactory), e Factories pode conhecer Domain. Sem as duas regras abaixo, Compartilhado chegaria
// ao Domain de um módulo por tabela, passando por uma factory, sem nenhum gate reprovar.
// Canário conferido em 18/09/2026: `use App\Cadastro\Domain\Bico` com uso real na PostoFactory
// deixou só a primeira vermelha; `use Database\Factories\BicoFactory` com uso real em PostoAtual,
// só a segunda.
arch('Database\\Factories\\PostoFactory: factory do Compartilhado não depende de nenhum módulo')
    ->expect('Database\\Factories\\PostoFactory')
    ->not->toUse(array_map(static fn (string $modulo): string => "App\\{$modulo}", modulos()));

arch('App\\Compartilhado: das factories, só conhece a PostoFactory')
    ->expect('App\\Compartilhado')
    ->not->toUse(array_values(array_filter(
        array_map(
            static fn (string $arquivo): string => 'Database\\Factories\\'.basename($arquivo, '.php'),
            glob(__DIR__.'/../../database/factories/*.php') ?: [],
        ),
        static fn (string $factory): bool => $factory !== 'Database\\Factories\\PostoFactory',
    )));

arch('sem chamada de depuração esquecida')->expect(['dd', 'ddd', 'dump', 'ray', 'var_dump', 'print_r', 'var_export'])
    ->not->toBeUsed();

arch('env() só dentro de config/ — fora dele some com o config:cache')->expect('env')
    ->not->toBeUsed();

arch('sem função insegura (eval, md5, sha1, rand, unserialize…)')->expect([
    'eval', 'exec', 'shell_exec', 'system', 'passthru', 'md5', 'sha1', 'uniqid', 'rand', 'mt_rand',
    'tempnam', 'str_shuffle', 'shuffle', 'array_rand', 'unserialize', 'extract', 'mb_parse_str', 'dl', 'assert',
])->not->toBeUsed();

// Uma regra POR namespace de controller. `expect([lista])` no Pest 5 NÃO reprova — o teste
// de mutação de 18/09 pôs um model dentro do CatalogoController e a forma com lista passou
// verde; com o namespace sozinho, reprovou. Não "simplificar" de volta para a lista.
foreach (['App\\Http\\Controllers', ...namespacesDosModulos('Http\\Controllers')] as $controllers) {
    arch("{$controllers}: não toca model — lê e escreve pela camada Application")->expect($controllers)
        ->not->toUse(['App\\Models', ...namespacesDosModulos('Domain')]);

    arch("{$controllers}: valida por FormRequest, não por Request cru nem validator()")->expect($controllers)
        ->not->toUse(['Illuminate\\Http\\Request', 'Illuminate\\Support\\Facades\\Validator', 'validator', 'request']);
}

foreach (namespacesDosModulos('Http\\Controllers') as $controllers) {
    arch("{$controllers}: classe termina em Controller")->expect($controllers)
        ->classes()
        ->toHaveSuffix('Controller');
}

arch('enum é string-backed: o banco guarda o texto, e o texto é o contrato')->expect('App')
    ->enums()
    ->toBeStringBackedEnums();
