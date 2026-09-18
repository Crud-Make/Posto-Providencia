<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\Tanque;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Tanque> */
final class TanqueFactory extends Factory
{
    protected $model = Tanque::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'nome' => 'Tanque '.fake()->unique()->numberBetween(1, 9999),
            'combustivel_id' => Combustivel::factory(),
            'capacidade' => 15000,
            'estoque_atual' => fake()->randomFloat(2, 0, 15000),
            'ativo' => true,
        ];
    }
}
