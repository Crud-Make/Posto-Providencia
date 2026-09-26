<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\Frentista;
use App\Compartilhado\Eventos\FrentistaDesativado;
use App\Compartilhado\PostoAtual;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * A gestão de equipe do painel pela API (#103, tela Frentistas): listar, cadastrar, editar e
 * desativar frentista do posto em foco ({@see PostoAtual}).
 *
 * Porte fiel do que o painel fazia no Supabase (`useFrentistas` + `frentistaService`):
 * - a lista traz ativos E inativos, por nome (`.select('*').eq('posto_id').order('nome')`);
 * - "Excluir" nunca apagou: é `ativo = false` (`frentistaService.delete`), e continua sendo;
 * - editar grava nome, admissão e status — e só isso.
 *
 * O que muda, por ser multi-tenant: o frentista de outro posto não é alcançável pelo id (o escopo
 * do trait `PertenceAoPosto` o esconde → `null` → 404), e editar não "muda o frentista de posto" (o
 * UPDATE do Supabase gravava `posto_id` do corpo). A tabela não tem trigger (01-esquema-base.sql).
 *
 * Toda passagem para inativo emite {@see FrentistaDesativado} dentro da transação: Pessoas derruba
 * as sessões de PIN abertas dele.
 */
final readonly class EquipeDoPosto
{
    /** @return Collection<int, Frentista> */
    public function listar(): Collection
    {
        return Frentista::query()
            ->orderBy('nome')
            ->get(['id', 'nome', 'data_admissao', 'ativo', 'foto']);
    }

    public function cadastrar(FrentistaDeclarado $declarado): Frentista
    {
        return DB::transaction(function () use ($declarado): Frentista {
            $frentista = new Frentista;
            $this->grava($frentista, $declarado);

            return $frentista;
        });
    }

    public function editar(int $frentistaId, FrentistaDeclarado $declarado): ?Frentista
    {
        return DB::transaction(function () use ($frentistaId, $declarado): ?Frentista {
            $frentista = $this->doPosto($frentistaId);
            if ($frentista !== null) {
                $this->grava($frentista, $declarado);
            }

            return $frentista;
        });
    }

    /** O botão "Excluir" da tela: `ativo = false`, nada apagado. Repetir é inofensivo. */
    public function desativar(int $frentistaId): ?Frentista
    {
        return DB::transaction(function () use ($frentistaId): ?Frentista {
            $frentista = $this->doPosto($frentistaId);
            if ($frentista !== null) {
                $frentista->ativo = false;
                $this->salva($frentista);
            }

            return $frentista;
        });
    }

    private function doPosto(int $frentistaId): ?Frentista
    {
        return Frentista::query()->whereKey($frentistaId)->lockForUpdate()->first(['id', 'nome', 'data_admissao', 'ativo', 'foto', 'posto_id']);
    }

    private function grava(Frentista $frentista, FrentistaDeclarado $declarado): void
    {
        $frentista->fill(['nome' => $declarado->nome, 'data_admissao' => $declarado->dataAdmissao, 'ativo' => $declarado->ativo]);
        $this->salva($frentista);
    }

    private function salva(Frentista $frentista): void
    {
        $frentista->save();

        if (! $frentista->ativo && is_int($frentista->posto_id)) {
            event(new FrentistaDesativado($frentista->posto_id, $frentista->id));
        }
    }
}
