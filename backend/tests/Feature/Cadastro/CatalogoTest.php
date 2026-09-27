<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\FormaPagamento;
use App\Cadastro\Domain\Fornecedor;
use App\Cadastro\Domain\Frentista;
use App\Cadastro\Domain\Maquininha;
use App\Cadastro\Domain\Tanque;
use App\Cadastro\Domain\Turno;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;

use function Pest\Laravel\getJson;
use function Pest\Laravel\withToken;

require_once __DIR__.'/../PwaFrentista/Cenario.php';

/**
 * Token do login da API (Sanctum) de um usuário com vínculo ativo `$papel` a cada posto de
 * `$postos` — o crachá que o painel manda. Emitido direto no model, como o `Entrar` faz, para não
 * passar pelo `throttle:6,1` do `/login` a cada teste.
 *
 * @param  list<Posto>  $postos
 */
function tokenDoCatalogo(array $postos, PapelNoPosto $papel = PapelNoPosto::Operador, Role $role = Role::Operador): string
{
    $usuario = Usuario::factory()->create(['role' => $role]);
    foreach ($postos as $posto) {
        UsuarioPosto::factory()->create(['usuario_id' => $usuario->id, 'posto_id' => $posto->id, 'role' => $papel]);
    }

    return $usuario->createToken('teste-catalogo', ['*'], now()->addHour())->plainTextToken;
}

/**
 * Contra o Postgres real (esquema de produção), em transação que reverte no fim de cada teste.
 * Dois postos, para provar que o catálogo de um nunca vaza no outro — a RLS nunca fez isso.
 *
 * @return array{postoA: Posto, postoB: Posto, combustivelA: Combustivel, bombaA: Bomba, tanqueA: Tanque, bicoA: Bico}
 */
function cenarioDoisPostos(): array
{
    $postoA = Posto::factory()->create();
    $postoB = Posto::factory()->create();

    $combustivelA = Combustivel::factory()->create(['posto_id' => $postoA->id]);
    $bombaA = Bomba::factory()->create(['posto_id' => $postoA->id]);
    $tanqueA = Tanque::factory()->create(['posto_id' => $postoA->id, 'combustivel_id' => $combustivelA->id]);
    $bicoA = Bico::factory()->create([
        'posto_id' => $postoA->id,
        'bomba_id' => $bombaA->id,
        'combustivel_id' => $combustivelA->id,
        'tanque_id' => $tanqueA->id,
    ]);

    $combustivelB = Combustivel::factory()->create(['posto_id' => $postoB->id]);
    $bombaB = Bomba::factory()->create(['posto_id' => $postoB->id]);
    Bico::factory()->create(['posto_id' => $postoB->id, 'bomba_id' => $bombaB->id, 'combustivel_id' => $combustivelB->id]);

    return compact('postoA', 'postoB', 'combustivelA', 'bombaA', 'tanqueA', 'bicoA');
}

it('lista só os bicos do posto da rota, com bomba, combustível e tanque', function (): void {
    $c = cenarioDoisPostos();

    withToken(tokenDoCatalogo([$c['postoA']]))->getJson("/api/postos/{$c['postoA']->id}/bicos")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $c['bicoA']->id)
        ->assertJsonPath('data.0.bomba.id', $c['bombaA']->id)
        ->assertJsonPath('data.0.combustivel.codigo', $c['combustivelA']->codigo)
        ->assertJsonPath('data.0.tanque.id', $c['tanqueA']->id);
});

it('devolve dinheiro como string decimal, nunca float', function (): void {
    $c = cenarioDoisPostos();

    $preco = withToken(tokenDoCatalogo([$c['postoA']]))->getJson("/api/postos/{$c['postoA']->id}/combustiveis")->assertOk()->json('data.0.preco_venda');

    expect($preco)->toBeString()->toMatch('/^\d+\.\d{2}$/');
});

it('responde 404 para posto que não existe, depois do token', function (): void {
    $admin = tokenDoCatalogo([], role: Role::Admin);

    withToken($admin)->getJson('/api/postos/999999/bicos')->assertNotFound();
    withToken($admin)->getJson('/api/postos/abc/bicos')->assertNotFound();
});

/*
|--------------------------------------------------------------------------
| Isolamento entre postos (#102, autenticacao.md §3b): o catálogo fecha atrás de login
|--------------------------------------------------------------------------
| Antes era público: qualquer um, e um gerente só do Jorro, lia preço de custo, taxa, CNPJ e
| telefone de frentista do Posto BR. Agora: sem token 401, gerente só de um posto 403 no outro,
| gerente do posto 200. Token de frentista (PIN) não é crachá do painel: 401.
*/
dataset('rotasDoCatalogo', [
    'combustiveis', 'tanques', 'bombas', 'bicos', 'turnos', 'frentistas',
    'formas-pagamento', 'maquininhas', 'fornecedores',
]);

it('sem token: 401 em cada rota do catálogo, antes de olhar o posto', function (string $rota): void {
    $posto = Posto::factory()->create();

    getJson("/api/postos/{$posto->id}/{$rota}")->assertUnauthorized();
    getJson("/api/postos/999999/{$rota}")->assertUnauthorized();
})->with('rotasDoCatalogo');

it('gerente só do Jorro: 403 no catálogo do BR', function (string $rota): void {
    $jorro = Posto::factory()->create();
    $br = Posto::factory()->create();
    $token = tokenDoCatalogo([$jorro], PapelNoPosto::Gerente, Role::Gerente);

    withToken($token)->getJson("/api/postos/{$br->id}/{$rota}")->assertForbidden();
    withToken($token)->getJson("/api/postos/{$jorro->id}/{$rota}")->assertOk();
})->with('rotasDoCatalogo');

it('gerente do BR: 200 no catálogo do BR', function (string $rota): void {
    $br = Posto::factory()->create();
    $token = tokenDoCatalogo([$br], PapelNoPosto::Gerente, Role::Gerente);

    withToken($token)->getJson("/api/postos/{$br->id}/{$rota}")->assertOk();
})->with('rotasDoCatalogo');

it('vínculo desativado com o posto: 403', function (): void {
    $posto = Posto::factory()->create();
    $usuario = Usuario::factory()->create(['role' => Role::Gerente]);
    UsuarioPosto::factory()->create(['usuario_id' => $usuario->id, 'posto_id' => $posto->id, 'role' => PapelNoPosto::Gerente, 'ativo' => false]);
    $token = $usuario->createToken('teste-catalogo', ['*'], now()->addHour())->plainTextToken;

    withToken($token)->getJson("/api/postos/{$posto->id}/combustiveis")->assertForbidden();
});

it('token de frentista (PIN) não abre o catálogo: 401', function (): void {
    $posto = Posto::factory()->create();
    $frentista = frentistaDoPwa($posto);
    $token = tokenDoFrentista($posto, $frentista);

    withToken($token)->getJson("/api/postos/{$posto->id}/combustiveis")->assertUnauthorized();
});

it('cada endpoint do catálogo responde só o que é do posto', function (string $rota, string $model): void {
    $c = cenarioDoisPostos();
    $model::factory()->create(['posto_id' => $c['postoB']->id]);
    $model::factory()->create(['posto_id' => $c['postoA']->id]);

    $ids = withToken(tokenDoCatalogo([$c['postoA']]))->getJson("/api/postos/{$c['postoA']->id}/{$rota}")->assertOk()->json('data.*.id');
    $doPostoA = $model::query()->withoutGlobalScope('posto')->where('posto_id', $c['postoA']->id)->pluck('id')->all();

    expect($ids)->toEqualCanonicalizing($doPostoA);
})->with([
    'combustiveis' => ['combustiveis', Combustivel::class],
    'tanques' => ['tanques', Tanque::class],
    'bombas' => ['bombas', Bomba::class],
    'turnos' => ['turnos', Turno::class],
    'frentistas' => ['frentistas', Frentista::class],
    'formas de pagamento' => ['formas-pagamento', FormaPagamento::class],
    'maquininhas' => ['maquininhas', Maquininha::class],
    'fornecedores' => ['fornecedores', Fornecedor::class],
]);

it('nunca expõe a foto do frentista pelo catálogo', function (): void {
    $c = cenarioDoisPostos();
    Frentista::factory()->create(['posto_id' => $c['postoA']->id, 'foto' => 'data:image/jpeg;base64,'.base64_encode('x')]);

    withToken(tokenDoCatalogo([$c['postoA']]))->getJson("/api/postos/{$c['postoA']->id}/frentistas")
        ->assertOk()
        ->assertJsonMissingPath('data.0.foto');
});

// user_id tem FK para auth.users (01-esquema-base.sql:696), então fica sem valor: se o Resource
// o emitisse, a chave viria como null e o assertJsonMissingPath reprovaria do mesmo jeito.
it('nunca expõe cpf nem user_id do frentista pelo catálogo', function (): void {
    $c = cenarioDoisPostos();
    Frentista::factory()->create(['posto_id' => $c['postoA']->id, 'cpf' => '12345678901']);

    withToken(tokenDoCatalogo([$c['postoA']]))->getJson("/api/postos/{$c['postoA']->id}/frentistas")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonMissingPath('data.0.cpf')
        ->assertJsonMissingPath('data.0.user_id');
});

/**
 * Taxa, capacidade e estoque são colunas numeric do banco: saem como string decimal de escala 2
 * (cast decimal:2 dos models), nunca float. O módulo não faz conta; só serializa.
 */
it('devolve taxa, capacidade e estoque como string decimal de escala 2', function (string $rota, string $model, string $campo): void {
    $c = cenarioDoisPostos();
    $model::factory()->create(['posto_id' => $c['postoA']->id]);

    $valor = withToken(tokenDoCatalogo([$c['postoA']]))->getJson("/api/postos/{$c['postoA']->id}/{$rota}")->assertOk()->json("data.0.{$campo}");

    expect($valor)->toBeString()->toMatch('/^\d+\.\d{2}$/');
})->with([
    'taxa da forma de pagamento' => ['formas-pagamento', FormaPagamento::class, 'taxa'],
    'taxa da maquininha' => ['maquininhas', Maquininha::class, 'taxa'],
    'capacidade do tanque' => ['tanques', Tanque::class, 'capacidade'],
    'estoque atual do tanque' => ['tanques', Tanque::class, 'estoque_atual'],
]);

it('ordena bicos por numero, não por id', function (): void {
    $c = cenarioDoisPostos();
    foreach ([2, 1] as $numero) {
        Bico::factory()->create([
            'posto_id' => $c['postoA']->id,
            'bomba_id' => $c['bombaA']->id,
            'combustivel_id' => $c['combustivelA']->id,
            'tanque_id' => $c['tanqueA']->id,
            'numero' => $numero,
        ]);
    }
    $c['bicoA']->delete();

    $numeros = withToken(tokenDoCatalogo([$c['postoA']]))->getJson("/api/postos/{$c['postoA']->id}/bicos")->assertOk()->json('data.*.numero');

    expect($numeros)->toBe([1, 2]);
});

it('ordena combustíveis por nome, não por id', function (): void {
    $posto = Posto::factory()->create();
    Combustivel::factory()->create(['posto_id' => $posto->id, 'nome' => 'Etanol']);
    Combustivel::factory()->create(['posto_id' => $posto->id, 'nome' => 'Diesel']);

    $nomes = withToken(tokenDoCatalogo([$posto]))->getJson("/api/postos/{$posto->id}/combustiveis")->assertOk()->json('data.*.nome');

    expect($nomes)->toBe(['Diesel', 'Etanol']);
});

/**
 * Os Resources usam whenLoaded, que nunca faz lazy load: se alguém tirar um with() do
 * CatalogoDoPosto, o campo aninhado simplesmente some do JSON. Este teste prende o eager loading.
 */
it('cada item aninha as relações que o contrato promete', function (string $rota, array $estruturaDoItem, callable $semeia): void {
    $c = cenarioDoisPostos();
    $semeia($c);

    withToken(tokenDoCatalogo([$c['postoA']]))->getJson("/api/postos/{$c['postoA']->id}/{$rota}")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonStructure(['data' => ['*' => $estruturaDoItem]]);
})->with([
    'bicos: bomba, combustivel e tanque' => [
        'bicos',
        ['id', 'numero', 'ativo', 'bomba' => ['id'], 'combustivel' => ['id'], 'tanque' => ['id']],
        fn (array $c) => Bico::factory()->create([
            'posto_id' => $c['postoA']->id,
            'bomba_id' => $c['bombaA']->id,
            'combustivel_id' => $c['combustivelA']->id,
            'tanque_id' => $c['tanqueA']->id,
        ]),
    ],
    'tanques: combustivel' => [
        'tanques',
        ['id', 'nome', 'combustivel' => ['id']],
        fn (array $c) => Tanque::factory()->create(['posto_id' => $c['postoA']->id, 'combustivel_id' => $c['combustivelA']->id]),
    ],
    'frentistas: turno' => [
        'frentistas',
        ['id', 'nome', 'turno' => ['id']],
        function (array $c): void {
            $turno = Turno::factory()->create(['posto_id' => $c['postoA']->id]);
            Frentista::factory()->count(2)->create(['posto_id' => $c['postoA']->id, 'turno_id' => $turno->id]);
        },
    ],
]);
