<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Pessoas\Domain\Usuario;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;

/**
 * Confere as credenciais e emite o token da API (Sanctum, modo token — #102).
 *
 * Dois jeitos de dizer quem é: pelo e-mail, ou pelo nome de usuário no cartão do posto escolhido
 * (banco/init/15-login-por-usuario.sql). O nome mora no vínculo `UsuarioPosto`, porque as contas
 * são separadas por posto e o mesmo nome ("elias") se repete em postos diferentes.
 *
 * Qualquer falha devolve `null`, sem dizer qual: conta inexistente, senha errada, usuário ou
 * vínculo inativo, ou sem senha definida são a mesma resposta para quem está do lado de fora.
 * Quando a conta não existe, o hash é conferido mesmo assim, contra um hash descartável, para o
 * tempo de resposta não entregar quais contas existem.
 */
final readonly class Entrar
{
    /** Hash bcrypt de uma senha aleatória: só existe para gastar o mesmo tempo de um `check` real. */
    private const HASH_DESCARTAVEL = '$2y$12$Py5T56CgnidKkTFnvg310.vwXPVsRb4nmtMMb8M0kdSBLZjIvP0vu';

    /** @return array{token: string, usuario: Usuario}|null */
    public function __invoke(string $email, string $senha, string $dispositivo): ?array
    {
        $usuario = Usuario::query()
            ->whereRaw('lower(email) = ?', [mb_strtolower(trim($email))])
            ->first();

        return $this->confere($usuario, $senha, $dispositivo);
    }

    /**
     * Login pelo cartão do posto. Texto com "@" é e-mail: a conta sem nome de usuário (o ADMIN,
     * por exemplo) continua entrando pelo mesmo cartão.
     *
     * @return array{token: string, usuario: Usuario}|null
     */
    public function noPosto(int $postoId, string $login, string $senha, string $dispositivo): ?array
    {
        if (str_contains($login, '@')) {
            return $this($login, $senha, $dispositivo);
        }

        $usuario = Usuario::query()
            ->whereHas('vinculos', fn (Builder $vinculo): Builder => $vinculo
                ->where('posto_id', $postoId)
                ->where('ativo', true)
                ->whereRaw('lower(usuario) = ?', [mb_strtolower(trim($login))]))
            ->first();

        return $this->confere($usuario, $senha, $dispositivo);
    }

    /** @return array{token: string, usuario: Usuario}|null */
    private function confere(?Usuario $usuario, string $senha, string $dispositivo): ?array
    {
        $hash = $usuario->senha ?? self::HASH_DESCARTAVEL;
        $confere = Hash::check($senha, $hash);

        if ($usuario === null || ! $confere || ! $usuario->ativo || $usuario->senha === null) {
            return null;
        }

        $minutos = config('sanctum.expiration');
        $vence = is_int($minutos) && $minutos > 0 ? now()->addMinutes($minutos) : null;

        return [
            'token' => $usuario->createToken($dispositivo, ['*'], $vence)->plainTextToken,
            'usuario' => $usuario,
        ];
    }
}
