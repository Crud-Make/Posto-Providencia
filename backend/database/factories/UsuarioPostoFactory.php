<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Cadastro\Domain\Posto;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<UsuarioPosto> */
final class UsuarioPostoFactory extends Factory
{
    protected $model = UsuarioPosto::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'usuario_id' => Usuario::factory(),
            'posto_id' => Posto::factory(),
            'role' => PapelNoPosto::Operador,
            'ativo' => true,
        ];
    }
}
