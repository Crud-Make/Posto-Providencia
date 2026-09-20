<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Combustivel;
use App\Estoque\Domain\Estoque;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Estoque> */
final class EstoqueFactory extends Factory
{
    protected $model = Estoque::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'combustivel_id' => Combustivel::factory(),
            'quantidade_atual' => number_format(fake()->randomFloat(3, 1000, 20000), 3, '.', ''),
            'custo_medio' => number_format(fake()->randomFloat(2, 3, 7), 2, '.', ''),
            'capacidade_tanque' => '30000.000',
            'ultima_atualizacao' => now(),
        ];
    }
}
