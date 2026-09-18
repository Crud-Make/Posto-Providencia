<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Fornecedor;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Fornecedor> */
final class FornecedorFactory extends Factory
{
    protected $model = Fornecedor::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'nome' => fake()->company(),
            'cnpj' => fake()->unique()->numerify('##.###.###/0001-##'),
            'contato' => fake()->phoneNumber(),
            'ativo' => true,
        ];
    }
}
