<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Combustivel;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Combustivel> */
final class CombustivelFactory extends Factory
{
    protected $model = Combustivel::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'nome' => fake()->randomElement(['Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel S10']),
            'codigo' => fake()->unique()->lexify('???'),
            'cor' => fake()->hexColor(),
            'ativo' => true,
            'preco_venda' => fake()->randomFloat(2, 4, 8),
            'preco_custo' => fake()->randomFloat(4, 3, 6),
        ];
    }
}
