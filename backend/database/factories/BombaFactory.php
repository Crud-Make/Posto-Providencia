<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Bomba;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Bomba> */
final class BombaFactory extends Factory
{
    protected $model = Bomba::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'nome' => 'Bomba '.fake()->unique()->numberBetween(1, 9999),
            'localizacao' => fake()->optional()->word(),
            'ativo' => true,
        ];
    }
}
