<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\RecusaDoCadastro;
use App\Compartilhado\PostoAtual;
use Illuminate\Support\Facades\DB;

/**
 * Cadastro de bombas do posto em foco ({@see PostoAtual}) pelo painel (#153).
 *
 * - bomba de outro posto não é alcançável pelo id (escopo do `PertenceAoPosto` → `null` → 404);
 * - o nome é único no posto (`Bomba_nome_posto_unique`), e o repetido volta como recusa, não 500;
 * - nada se apaga: desativar é `ativo = false`, e só com a bomba sem bico ativo — bico ativo em
 *   bomba desativada seria linha de leitura de uma bomba que a tela diz não existir.
 */
final readonly class BombasDoPosto
{
    public function cadastrar(BombaDeclarada $declarada): Bomba|RecusaDoCadastro
    {
        return DB::transaction(fn (): Bomba|RecusaDoCadastro => $this->grava(new Bomba, $declarada));
    }

    public function editar(int $bombaId, BombaDeclarada $declarada): Bomba|RecusaDoCadastro|null
    {
        return DB::transaction(function () use ($bombaId, $declarada): Bomba|RecusaDoCadastro|null {
            $bomba = Bomba::query()->whereKey($bombaId)->lockForUpdate()->first();

            return $bomba === null ? null : $this->grava($bomba, $declarada);
        });
    }

    private function grava(Bomba $bomba, BombaDeclarada $declarada): Bomba|RecusaDoCadastro
    {
        $recusa = $this->recusa($bomba, $declarada);
        if ($recusa !== null) {
            return $recusa;
        }

        $bomba->fill(['nome' => $declarada->nome, 'localizacao' => $declarada->localizacao, 'ativo' => $declarada->ativo]);
        $bomba->save();

        return $bomba;
    }

    private function recusa(Bomba $bomba, BombaDeclarada $declarada): ?RecusaDoCadastro
    {
        $nomeEmUso = Bomba::query()
            ->where('nome', $declarada->nome)
            ->when($bomba->exists, fn ($consulta) => $consulta->whereKeyNot($bomba->id))
            ->exists();
        if ($nomeEmUso) {
            return new RecusaDoCadastro('nome_repetido', "Já existe uma bomba chamada {$declarada->nome} neste posto.");
        }

        if (! $declarada->ativo && $bomba->exists && Bico::query()->where('bomba_id', $bomba->id)->where('ativo', true)->exists()) {
            return new RecusaDoCadastro('bomba_com_bicos_ativos', 'Desative os bicos desta bomba antes de desativá-la.');
        }

        return null;
    }
}
