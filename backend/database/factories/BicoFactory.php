<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Bico> */
final class BicoFactory extends Factory
{
    protected $model = Bico::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'numero' => fake()->unique()->numberBetween(1, 999999),
            'bomba_id' => Bomba::factory(),
            'combustivel_id' => Combustivel::factory(),
            'tanque_id' => null,
            'ativo' => true,
        ];
    }
}
