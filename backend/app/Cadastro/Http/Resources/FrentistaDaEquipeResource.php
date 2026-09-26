<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Resources;

use App\Cadastro\Domain\Frentista;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Um frentista na gestão de equipe do painel (#103, tela Frentistas) — só o que a tela mostra:
 * nome, status, admissão e o avatar.
 *
 * A `foto` sai aqui porque a rota é protegida e de quem GERE o posto (a lista e o detalhe mostram o
 * rosto). No catálogo público ela continua fora. CPF e telefone ficam de fora também aqui: a tela
 * não os exibe, e dado pessoal que a tela não usa não viaja. `data_admissao` em ISO UTC, o mesmo
 * instante que o PostgREST devolvia.
 *
 * @mixin Frentista
 */
final class FrentistaDaEquipeResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'data_admissao' => $this->data_admissao->utc()->toIso8601ZuluString(),
            'ativo' => $this->ativo,
            'foto' => $this->foto,
        ];
    }
}
