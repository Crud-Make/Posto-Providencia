<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\FormaPagamento;
use App\Cadastro\Domain\Fornecedor;
use App\Cadastro\Domain\Frentista;
use App\Cadastro\Domain\Maquininha;
use App\Cadastro\Domain\Posto;
use App\Cadastro\Domain\Tanque;
use App\Cadastro\Domain\Turno;

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
