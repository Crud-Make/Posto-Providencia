<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Pessoas\Domain\Usuario;
use Illuminate\Support\Facades\Hash;

/**
 * Confere e-mail e senha e emite o token da API (Sanctum, modo token — #102).
 *
 * Qualquer falha devolve `null`, sem dizer qual: e-mail inexistente, senha errada, usuário
 * inativo ou sem senha definida são a mesma resposta para quem está do lado de fora. Quando o
 * e-mail não existe, o hash é conferido mesmo assim, contra um hash descartável, para o tempo de
 * resposta não entregar quais e-mails têm conta.
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
