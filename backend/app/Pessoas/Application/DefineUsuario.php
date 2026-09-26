<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

/**
 * Cria o usuário, ou atualiza o que já existe com aquele e-mail, e grava os vínculos com posto.
 *
 * É o que o comando `usuario:definir` chama: enquanto não há "esqueci a senha" por e-mail, a
 * conta nasce e a senha é redefinida por aqui. Rodar de novo com a mesma entrada não duplica nada.
 */
final readonly class DefineUsuario
{
    /**
     * @param  array<int, PapelNoPosto>  $vinculos  posto_id => papel naquele posto
     */
    public function __invoke(string $email, string $nome, Role $role, string $senha, array $vinculos): Usuario
    {
        return DB::transaction(function () use ($email, $nome, $role, $senha, $vinculos): Usuario {
            $usuario = Usuario::query()->whereRaw('lower(email) = ?', [mb_strtolower(trim($email))])->first()
                ?? new Usuario(['email' => mb_strtolower(trim($email))]);

            $usuario->fill(['nome' => $nome, 'role' => $role, 'senha' => $senha, 'ativo' => true])->save();

            foreach ($vinculos as $postoId => $papel) {
                UsuarioPosto::query()->updateOrCreate(
                    ['usuario_id' => $usuario->id, 'posto_id' => $postoId],
                    ['role' => $papel, 'ativo' => true],
                );
            }

            return $usuario;
        });
    }
}
