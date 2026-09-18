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

arch('todo arquivo de app/ declara strict_types')->expect('App')
    ->toUseStrictTypes();

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
