<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Pessoas\Domain\Usuario;

/**
 * Os postos em que o usuário pode entrar — é a lista da tela "em qual posto você quer entrar?".
 *
 * Mesma regra do `PostoPolicy::ver`, dita ao contrário: ADMIN entra em todo posto ativo; os
 * demais, só onde têm vínculo ativo. Posto desativado some da lista para todos.
 */
final readonly class PostosDoUsuario
{
    /** @return list<array{id: int, nome: string, papel: string}> */
    public function __invoke(Usuario $usuario): array
    {
        if (! $usuario->ativo) {
            return [];
        }

        if ($usuario->role === Role::Admin) {
            $lista = [];
            foreach (Posto::query()->where('ativo', true)->orderBy('id')->get() as $posto) {
                $lista[] = ['id' => $posto->id, 'nome' => $posto->nome, 'papel' => PapelNoPosto::Admin->value];
            }

            return $lista;
        }

        $lista = [];
        foreach ($usuario->vinculos()->where('ativo', true)->with('posto')->orderBy('posto_id')->get() as $vinculo) {
            $posto = $vinculo->posto;
            if ($posto instanceof Posto && $posto->ativo) {
                $lista[] = ['id' => $posto->id, 'nome' => $posto->nome, 'papel' => ($vinculo->role ?? PapelNoPosto::Operador)->value];
            }
        }

        return $lista;
    }
}
