<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Compartilhado\Enums\StatusFechamento;
use App\Fechamento\Domain\Fechamento;
use App\Pessoas\Domain\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * O fechamento de um dia.
 *
 * `total_vendas` e `diferenca` nascem **null** de propósito: é o estado "dia não apurado" da
 * invariante I8, e é como o `create` do painel grava (`fechamento.service.ts:166`). Teste que
 * precisa do dia apurado passa os valores explicitamente — assim o padrão nunca finge apuração.
 *
 * @extends Factory<Fechamento>
 */
final class FechamentoFactory extends Factory
{
    protected $model = Fechamento::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'data' => fake()->dateTimeBetween('-60 days', 'now'),
            'total_vendas' => null,
            'total_recebido' => '0.00',
            'diferenca' => null,
            'status' => StatusFechamento::cases()[0],
            'observacoes' => null,
            'usuario_id' => Usuario::factory(),
            'turno_id' => null,
        ];
    }
}
