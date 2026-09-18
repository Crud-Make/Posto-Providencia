<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bomba;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;

it('sem posto atual, o escopo não filtra nada', function (): void {
    $a = Posto::factory()->create();
    $b = Posto::factory()->create();
    Bomba::factory()->create(['posto_id' => $a->id]);
    Bomba::factory()->create(['posto_id' => $b->id]);

    $ids = Bomba::query()->whereIn('posto_id', [$a->id, $b->id])->pluck('posto_id')->unique()->all();

    expect($ids)->toHaveCount(2);
});

it('com posto atual, toda consulta ganha posto_id = atual', function (): void {
    $a = Posto::factory()->create();
    $b = Posto::factory()->create();
    Bomba::factory()->create(['posto_id' => $a->id, 'nome' => 'Bomba do A']);
    Bomba::factory()->create(['posto_id' => $b->id, 'nome' => 'Bomba do B']);

    app(PostoAtual::class)->definir($a->id);

    expect(Bomba::query()->pluck('nome')->all())->toBe(['Bomba do A'])
        ->and(Bomba::query()->where('nome', 'Bomba do B')->exists())->toBeFalse();
});

it('ao criar sem posto_id, preenche com o posto atual', function (): void {
    $a = Posto::factory()->create();
    app(PostoAtual::class)->definir($a->id);

    $bomba = Bomba::factory()->create(['posto_id' => null]);

    expect($bomba->posto_id)->toBe($a->id)
        ->and($bomba->posto?->is($a))->toBeTrue();
});

it('withoutGlobalScope continua sendo a porta explícita para ver outros postos', function (): void {
    $a = Posto::factory()->create();
    $b = Posto::factory()->create();
    Bomba::factory()->create(['posto_id' => $b->id, 'nome' => 'Bomba do B']);
    app(PostoAtual::class)->definir($a->id);

    expect(Bomba::query()->withoutGlobalScope('posto')->where('nome', 'Bomba do B')->exists())->toBeTrue();
});
