<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\RecusaDoCadastro;
use App\Cadastro\Domain\Tanque;
use App\Compartilhado\PostoAtual;
use Illuminate\Support\Facades\DB;

/**
 * Cadastro de tanques do posto em foco ({@see PostoAtual}) pelo painel (#157).
 *
 * - SEM estoque (decisão do dono, 27/09): o tanque nasce com `estoque_atual` 0 (o default do banco)
 *   e editar nunca o toca — o estoque de partida é a primeira régua, e depois quem mexe é a compra;
 * - o combustível tem de ser DO POSTO (o escopo do `PertenceAoPosto` esconde o de outro → 422);
 * - com bico ligado ou régua medida o tanque NÃO troca de combustível: quebraria o casamento
 *   bico × tanque × combustível e a série da régua. `HistoricoTanque` é do módulo Estoque: lido
 *   por query builder (CA-7);
 * - só desativa sem bico ativo puxando dele; nada se apaga.
 */
final readonly class TanquesDoPosto
{
    public function cadastrar(TanqueDeclarado $declarado): Tanque|RecusaDoCadastro
    {
        return DB::transaction(fn (): Tanque|RecusaDoCadastro => $this->grava(new Tanque, $declarado));
    }

    public function editar(int $tanqueId, TanqueDeclarado $declarado): Tanque|RecusaDoCadastro|null
    {
        return DB::transaction(function () use ($tanqueId, $declarado): Tanque|RecusaDoCadastro|null {
            $tanque = Tanque::query()->whereKey($tanqueId)->lockForUpdate()->first();

            return $tanque === null ? null : $this->grava($tanque, $declarado);
        });
    }

    private function grava(Tanque $tanque, TanqueDeclarado $declarado): Tanque|RecusaDoCadastro
    {
        $recusa = $this->recusaDoCombustivel($tanque, $declarado) ?? $this->recusaDoStatus($tanque, $declarado);
        if ($recusa !== null) {
            return $recusa;
        }

        $tanque->fill([
            'nome' => $declarado->nome,
            'combustivel_id' => $declarado->combustivelId,
            'capacidade' => $declarado->capacidade,
            'ativo' => $declarado->ativo,
        ]);
        $tanque->save();

        return $tanque->refresh();
    }

    private function recusaDoCombustivel(Tanque $tanque, TanqueDeclarado $declarado): ?RecusaDoCadastro
    {
        if (! Combustivel::query()->whereKey($declarado->combustivelId)->exists()) {
            return new RecusaDoCadastro('combustivel_invalido', 'O combustível não existe neste posto.');
        }

        $troca = $tanque->exists && $tanque->combustivel_id !== $declarado->combustivelId;
        $preso = $troca && (
            Bico::query()->where('tanque_id', $tanque->id)->exists()
            || DB::table('HistoricoTanque')->where('tanque_id', $tanque->id)->exists()
        );

        return $preso
            ? new RecusaDoCadastro('combustivel_travado', 'Este tanque já tem bico ligado ou régua medida e não pode trocar de combustível.')
            : null;
    }

    private function recusaDoStatus(Tanque $tanque, TanqueDeclarado $declarado): ?RecusaDoCadastro
    {
        $desativa = ! $declarado->ativo && $tanque->exists;

        return $desativa && Bico::query()->where('tanque_id', $tanque->id)->where('ativo', true)->exists()
            ? new RecusaDoCadastro('tanque_com_bicos_ativos', 'Desative ou troque de tanque os bicos que puxam dele antes de desativá-lo.')
            : null;
    }
}
