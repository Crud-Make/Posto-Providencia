<?php

declare(strict_types=1);

use App\Cadastro\Domain\Posto;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\Gate;

it('ADMIN global vê e gere qualquer posto, mesmo sem vínculo', function (): void {
    $posto = Posto::factory()->create();
    $admin = Usuario::factory()->create(['role' => Role::Admin]);

    expect(Gate::forUser($admin)->allows('ver', $posto))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('gerir', $posto))->toBeTrue();
});

it('operador só vê o posto onde tem vínculo ativo, e não gere', function (): void {
    $seu = Posto::factory()->create();
    $outro = Posto::factory()->create();
    $operador = Usuario::factory()->create(['role' => Role::Operador]);
    UsuarioPosto::factory()->create(['usuario_id' => $operador->id, 'posto_id' => $seu->id, 'role' => PapelNoPosto::Operador]);

    expect(Gate::forUser($operador)->allows('ver', $seu))->toBeTrue()
        ->and(Gate::forUser($operador)->allows('gerir', $seu))->toBeFalse()
        ->and(Gate::forUser($operador)->allows('ver', $outro))->toBeFalse();
});

it('gerente do posto gere o posto; vínculo inativo não vale', function (): void {
    $posto = Posto::factory()->create();
    $gerente = Usuario::factory()->create(['role' => Role::Gerente]);
    UsuarioPosto::factory()->create(['usuario_id' => $gerente->id, 'posto_id' => $posto->id, 'role' => PapelNoPosto::Gerente]);

    expect(Gate::forUser($gerente)->allows('gerir', $posto))->toBeTrue();

    UsuarioPosto::query()->where('usuario_id', $gerente->id)->update(['ativo' => false]);

    expect(Gate::forUser($gerente)->allows('ver', $posto))->toBeFalse();
});

it('usuário desativado não vê nada, nem com vínculo', function (): void {
    $posto = Posto::factory()->create();
    $usuario = Usuario::factory()->create(['role' => Role::Gerente, 'ativo' => false]);
    UsuarioPosto::factory()->create(['usuario_id' => $usuario->id, 'posto_id' => $posto->id, 'role' => PapelNoPosto::Admin]);

    expect(Gate::forUser($usuario)->allows('ver', $posto))->toBeFalse();
});
