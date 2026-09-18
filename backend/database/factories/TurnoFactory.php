<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Turno;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Turno> */
final class TurnoFactory extends Factory
{
    protected $model = Turno::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'nome' => fake()->randomElement(['Manhã', 'Tarde', 'Noite']).' '.fake()->unique()->numberBetween(1, 9999),
            'horario_inicio' => '06:00:00',
            'horario_fim' => '14:00:00',
            'ativo' => true,
        ];
    }
}
