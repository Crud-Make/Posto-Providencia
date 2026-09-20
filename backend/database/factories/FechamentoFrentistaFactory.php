<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Frentista;
use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\FechamentoFrentista;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * O envio de um frentista.
 *
 * Os baldes opcionais nascem **null**, não `'0.00'`: null é "não informou", zero é "informou
 * zero" (invariante I8). Uma factory que preenchesse tudo com zero esconderia exatamente o bug
 * que o Resource precisa não cometer.
 *
 * @extends Factory<FechamentoFrentista>
 */
final class FechamentoFrentistaFactory extends Factory
{
    protected $model = FechamentoFrentista::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'fechamento_id' => Fechamento::factory(),
            'frentista_id' => Frentista::factory(),
            'valor_dinheiro' => number_format(fake()->randomFloat(2, 0, 3000), 2, '.', ''),
            'valor_cartao' => number_format(fake()->randomFloat(2, 0, 3000), 2, '.', ''),
            'valor_pix' => number_format(fake()->randomFloat(2, 0, 1500), 2, '.', ''),
            'valor_nota' => '0.00',
            'valor_moedas' => '0.00',
            'valor_conferido' => number_format(fake()->randomFloat(2, 0, 9000), 2, '.', ''),
            'valor_cartao_debito' => null,
            'valor_cartao_credito' => null,
            'baratao' => null,
            'baratencia' => null,
            'encerrante' => null,
            'diferenca_calculada' => null,
            'observacoes' => null,
        ];
    }
}
