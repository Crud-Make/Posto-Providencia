<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\Frentista;
use App\Compartilhado\PostoAtual;
use Illuminate\Database\Eloquent\Collection;

/**
 * O frentista no PWA pela API (#101, fatia 2): a lista da tela de escolha, o próprio perfil e a
 * troca da própria foto. O posto é o {@see PostoAtual} (escopo do trait
 * `PertenceAoPosto`); o frentista do perfil e da foto é o do TOKEN.
 *
 * - `paraEscolher`: ativos do posto, por nome, só `id` e `nome` — é lida ANTES do PIN, sem token.
 *   A foto fica de fora de propósito (rosto de funcionário não é público; a #97 já a escondia no
 *   catálogo), e telefone/admissão também (o catálogo público ainda os expõe — pendência dele).
 * - `perfil`/`trocaFoto`: só do frentista do token. Não há `id` na rota: o A não alcança o B.
 */
final readonly class FrentistaDoPwa
{
    /** @return Collection<int, Frentista> */
    public function paraEscolher(): Collection
    {
        return Frentista::query()->where('ativo', true)->orderBy('nome')->get(['id', 'nome']);
    }

    public function perfil(int $frentistaId): Frentista
    {
        // O guard `frentista.do.posto` já conferiu que ele existe, está ativo e é deste posto.
        return Frentista::query()->whereKey($frentistaId)->firstOrFail(['id', 'nome', 'foto']);
    }

    /** @param  ?string  $foto  data URL JPEG já reduzida no aparelho, ou `null` para voltar às iniciais */
    public function trocaFoto(int $frentistaId, ?string $foto): Frentista
    {
        $frentista = $this->perfil($frentistaId);
        $frentista->foto = $foto;
        $frentista->save();

        return $frentista;
    }
}
