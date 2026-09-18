<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Frentista;
use App\Cadastro\Domain\Turno;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Frentista> */
final class FrentistaFactory extends Factory
{
    protected $model = Frentista::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'nome' => fake()->name(),
            'cpf' => fake()->unique()->numerify('###########'),
            'telefone' => fake()->phoneNumber(),
            'data_admissao' => fake()->dateTimeBetween('-3 years'),
            'ativo' => true,
            'turno_id' => Turno::factory(),
        ];
    }
}
