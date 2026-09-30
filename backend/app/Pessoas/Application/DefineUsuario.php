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
 * Com `$login`, grava o nome de usuário do cartão do posto (banco/init/15-login-por-usuario.sql)
 * em cada vínculo passado.
 */
final readonly class DefineUsuario
{
    /**
     * @param  array<int, PapelNoPosto>  $vinculos  posto_id => papel naquele posto
     * @param  string|null  $login  nome de usuário para o cartão de cada posto passado (null = não mexe)
     */
    public function __invoke(string $email, string $nome, Role $role, string $senha, array $vinculos, ?string $login = null): Usuario
    {
        return DB::transaction(function () use ($email, $nome, $role, $senha, $vinculos, $login): Usuario {
            $usuario = Usuario::query()->whereRaw('lower(email) = ?', [mb_strtolower(trim($email))])->first()
                ?? new Usuario(['email' => mb_strtolower(trim($email))]);

            $usuario->fill(['nome' => $nome, 'role' => $role, 'senha' => $senha, 'ativo' => true])->save();

            foreach ($vinculos as $postoId => $papel) {
                UsuarioPosto::query()->updateOrCreate(
                    ['usuario_id' => $usuario->id, 'posto_id' => $postoId],
                    array_filter(['role' => $papel, 'ativo' => true, 'usuario' => $login], fn (mixed $v): bool => $v !== null),
                );
            }

            return $usuario;
        });
    }
}
