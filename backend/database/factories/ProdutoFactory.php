<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Estoque\Domain\Produto;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Produto> */
final class ProdutoFactory extends Factory
{
    protected $model = Produto::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'nome' => 'Produto '.fake()->unique()->numberBetween(1, 99999),
            'categoria' => fake()->randomElement(['Óleo', 'Aditivo', 'Filtro']),
            'preco_custo' => '10.00',
            'preco_venda' => '19.90',
            'estoque_atual' => 10,
            'estoque_minimo' => 2,
            'unidade_medida' => 'unidade',
            'ativo' => true,
        ];
    }
}
