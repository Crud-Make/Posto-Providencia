<?php

declare(strict_types=1);

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Enums\StatusFechamento;

it('Role espelha o enum "Role" do banco', function (): void {
    expect(array_map(fn (Role $r) => $r->value, Role::cases()))
        ->toBe(['ADMIN', 'GERENTE', 'OPERADOR', 'FRENTISTA']);
});

it('StatusFechamento espelha o enum "StatusFechamento" do banco', function (): void {
    expect(array_map(fn (StatusFechamento $s) => $s->value, StatusFechamento::cases()))
        ->toEqualCanonicalizing(['RASCUNHO', 'FECHADO', 'ABERTO']);
});

it('PapelNoPosto: só admin e gerente gerenciam', function (): void {
    expect(PapelNoPosto::Admin->gerencia())->toBeTrue()
        ->and(PapelNoPosto::Gerente->gerencia())->toBeTrue()
        ->and(PapelNoPosto::Operador->gerencia())->toBeFalse()
        ->and(PapelNoPosto::from('operador'))->toBe(PapelNoPosto::Operador);
});
