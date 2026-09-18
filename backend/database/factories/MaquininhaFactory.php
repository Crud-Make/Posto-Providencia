<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Maquininha;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Maquininha> */
final class MaquininhaFactory extends Factory
{
    protected $model = Maquininha::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'nome' => 'Maquininha '.fake()->unique()->numberBetween(1, 9999),
            'operadora' => fake()->randomElement(['Stone', 'Rede', 'Cielo']),
            'taxa' => fake()->randomFloat(2, 1, 4),
            'ativo' => true,
        ];
    }
}
