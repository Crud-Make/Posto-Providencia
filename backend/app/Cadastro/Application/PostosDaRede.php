<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Compartilhado\Posto;
use Illuminate\Database\Eloquent\Collection;

/**
 * Os postos da rede que o PWA do frentista oferece na tela "Em qual posto?" (#101, decisão do dono
 * de 26/09/2026: escolhe na 1ª vez e lembra). É lida ANTES de qualquer PIN, sem token, por isso só
 * `id` e `nome` dos ATIVOS saem do banco — cnpj, endereço, telefone e e-mail ficam de fora já no
 * `select`, não só na serialização.
 *
 * A foto da fachada (27/09/2026) entra só como versão: `foto_atualizada_em`, e só quando há foto —
 * o blob nunca é lido aqui. O cartão monta a URL pública com {@see FotoDoPosto::caminho()}.
 */
final readonly class PostosDaRede
{
    /** @return Collection<int, Posto> */
    public function ativos(): Collection
    {
        return Posto::query()->where('ativo', true)->orderBy('id')->select(['id', 'nome'])
            ->selectRaw('case when foto is null then null else foto_atualizada_em end as foto_atualizada_em')
            ->get();
    }
}
