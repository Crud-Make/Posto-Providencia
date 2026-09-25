<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\FormaPagamento;
use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\Recebimento;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Um recebimento. **Não tem `posto_id`**: existe só escopado pelo `Fechamento` pai (TEN-3).
 *
 * @extends Factory<Recebimento>
 */
final class RecebimentoFactory extends Factory
{
    protected $model = Recebimento::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'fechamento_id' => Fechamento::factory(),
            'forma_pagamento_id' => FormaPagamento::factory(),
            'maquininha_id' => null,
            'valor' => number_format(fake()->randomFloat(2, 1, 5000), 2, '.', ''),
            'observacoes' => null,
        ];
    }
}
