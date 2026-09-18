<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Posto;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Posto> */
final class PostoFactory extends Factory
{
    protected $model = Posto::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'nome' => 'Posto '.fake()->unique()->company(),
            'cnpj' => fake()->unique()->numerify('##.###.###/0001-##'),
            'cidade' => fake()->city(),
            'estado' => 'BA',
            'ativo' => true,
        ];
    }
}
