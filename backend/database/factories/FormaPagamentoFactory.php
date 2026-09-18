<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\FormaPagamento;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FormaPagamento> */
final class FormaPagamentoFactory extends Factory
{
    protected $model = FormaPagamento::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'nome' => fake()->unique()->randomElement(['Dinheiro', 'Pix', 'Crédito', 'Débito', 'Nota/Vale', 'Moedas', 'Baratão']).' '.fake()->unique()->numberBetween(1, 9999),
            'tipo' => 'dinheiro',
            'ativo' => true,
            'taxa' => 0,
        ];
    }
}
