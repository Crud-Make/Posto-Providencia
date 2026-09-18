<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Compartilhado\Enums\Role;
use App\Pessoas\Domain\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Usuario> */
final class UsuarioFactory extends Factory
{
    protected $model = Usuario::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'nome' => fake()->name(),
            'role' => Role::Operador,
            'ativo' => true,
        ];
    }
}
