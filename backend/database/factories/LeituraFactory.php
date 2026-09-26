<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Combustivel;
use App\Fechamento\Domain\Leitura;
use App\Pessoas\Domain\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Encerrante de um bico num dia.
 *
 * Os valores saem coerentes de propósito — `litros = final − inicial` e
 * `valor = litros × preço` —, para que um teste que mexa num campo e esqueça os outros produza
 * uma linha visivelmente errada, em vez de uma que passa por acaso. Teste que precisa de
 * incoerência sobrescreve explicitamente.
 *
 * A factory pode falar com models de outros módulos: `Database\Factories` não é módulo, e o
 * Deptrac permite `Factories → Domain`.
 *
 * @extends Factory<Leitura>
 */
final class LeituraFactory extends Factory
{
    protected $model = Leitura::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $inicial = fake()->randomFloat(3, 1000, 90000);
        $litros = fake()->randomFloat(3, 1, 900);
        $preco = fake()->randomFloat(2, 4, 8);

        return [
            'data' => fake()->dateTimeBetween('-60 days', 'now'),
            'bico_id' => Bico::factory(),
            'combustivel_id' => Combustivel::factory(),
            'leitura_inicial' => number_format($inicial, 3, '.', ''),
            'leitura_final' => number_format($inicial + $litros, 3, '.', ''),
            'litros_vendidos' => number_format($litros, 3, '.', ''),
            'preco_litro' => number_format($preco, 2, '.', ''),
            'valor_total' => number_format(round($litros * $preco, 2), 2, '.', ''),
            'usuario_id' => Usuario::factory(),
            'turno_id' => null,
        ];
    }
}
