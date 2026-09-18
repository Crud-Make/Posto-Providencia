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
use App\Compartilhado\Posto;

use function Pest\Laravel\getJson;

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

    getJson("/api/postos/{$c['postoA']->id}/bicos")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $c['bicoA']->id)
        ->assertJsonPath('data.0.bomba.id', $c['bombaA']->id)
        ->assertJsonPath('data.0.combustivel.codigo', $c['combustivelA']->codigo)
        ->assertJsonPath('data.0.tanque.id', $c['tanqueA']->id);
});

it('devolve dinheiro como string decimal, nunca float', function (): void {
    $c = cenarioDoisPostos();

    $preco = getJson("/api/postos/{$c['postoA']->id}/combustiveis")->assertOk()->json('data.0.preco_venda');

    expect($preco)->toBeString()->toMatch('/^\d+\.\d{2}$/');
});

it('responde 404 para posto que não existe', function (): void {
    getJson('/api/postos/999999/bicos')->assertNotFound();
    getJson('/api/postos/abc/bicos')->assertNotFound();
});

it('cada endpoint do catálogo responde só o que é do posto', function (string $rota, string $model): void {
    $c = cenarioDoisPostos();
    $model::factory()->create(['posto_id' => $c['postoB']->id]);
    $model::factory()->create(['posto_id' => $c['postoA']->id]);

    $ids = getJson("/api/postos/{$c['postoA']->id}/{$rota}")->assertOk()->json('data.*.id');
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

    getJson("/api/postos/{$c['postoA']->id}/frentistas")
        ->assertOk()
        ->assertJsonMissingPath('data.0.foto');
});

// user_id tem FK para auth.users (01-esquema-base.sql:696), então fica sem valor: se o Resource
// o emitisse, a chave viria como null e o assertJsonMissingPath reprovaria do mesmo jeito.
it('nunca expõe cpf nem user_id do frentista pelo catálogo', function (): void {
    $c = cenarioDoisPostos();
    Frentista::factory()->create(['posto_id' => $c['postoA']->id, 'cpf' => '12345678901']);

    getJson("/api/postos/{$c['postoA']->id}/frentistas")
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

    $valor = getJson("/api/postos/{$c['postoA']->id}/{$rota}")->assertOk()->json("data.0.{$campo}");

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

    $numeros = getJson("/api/postos/{$c['postoA']->id}/bicos")->assertOk()->json('data.*.numero');

    expect($numeros)->toBe([1, 2]);
});

it('ordena combustíveis por nome, não por id', function (): void {
    $posto = Posto::factory()->create();
    Combustivel::factory()->create(['posto_id' => $posto->id, 'nome' => 'Etanol']);
    Combustivel::factory()->create(['posto_id' => $posto->id, 'nome' => 'Diesel']);

    $nomes = getJson("/api/postos/{$posto->id}/combustiveis")->assertOk()->json('data.*.nome');

    expect($nomes)->toBe(['Diesel', 'Etanol']);
});

/**
 * Os Resources usam whenLoaded, que nunca faz lazy load: se alguém tirar um with() do
 * CatalogoDoPosto, o campo aninhado simplesmente some do JSON. Este teste prende o eager loading.
 */
it('cada item aninha as relações que o contrato promete', function (string $rota, array $estruturaDoItem, callable $semeia): void {
    $c = cenarioDoisPostos();
    $semeia($c);

    getJson("/api/postos/{$c['postoA']->id}/{$rota}")
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
