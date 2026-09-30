<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\RecusaDoCadastro;
use App\Compartilhado\PostoAtual;
use Closure;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Cadastro de combustíveis do posto em foco ({@see PostoAtual}) pelo painel (#157).
 *
 * - o preço de venda do cadastro é o ponto de partida do dia; o dia salvo carimba o próprio
 *   `Leitura.preco_litro`, então mudar o cadastro não mexe em dia já salvo;
 * - o código (GC, GA, ET, S10…) é único no posto, inclusive entre inativos
 *   (`Combustivel_codigo_posto_unique`), e o repetido volta como recusa, não 500;
 * - com leitura ou compra lançada o código NÃO muda: é por ele que os relatórios dão cor e nome
 *   ao passado. `Leitura` e `Compra` são de outros módulos: lidas por query builder (CA-7);
 * - só desativa sem bico ativo — bico ativo de combustível desativado seria linha do Fechamento
 *   de um produto que a tela diz não vender;
 * - nada se apaga.
 */
final readonly class CombustiveisDoPosto
{
    public function cadastrar(CombustivelDeclarado $declarado): Combustivel|RecusaDoCadastro
    {
        return $this->transacao(fn (): Combustivel|RecusaDoCadastro => $this->grava(new Combustivel, $declarado)) ?? self::codigoRepetido();
    }

    public function editar(int $combustivelId, CombustivelDeclarado $declarado): Combustivel|RecusaDoCadastro|null
    {
        return $this->transacao(function () use ($combustivelId, $declarado): Combustivel|RecusaDoCadastro|null {
            $combustivel = Combustivel::query()->whereKey($combustivelId)->lockForUpdate()->first();

            return $combustivel === null ? null : $this->grava($combustivel, $declarado);
        });
    }

    /** @param  Closure(): (Combustivel|RecusaDoCadastro|null)  $escrita */
    private function transacao(Closure $escrita): Combustivel|RecusaDoCadastro|null
    {
        try {
            return DB::transaction($escrita);
        } catch (UniqueConstraintViolationException) {
            return self::codigoRepetido();
        }
    }

    private function grava(Combustivel $combustivel, CombustivelDeclarado $declarado): Combustivel|RecusaDoCadastro
    {
        $recusa = $this->recusaDoCodigo($combustivel, $declarado) ?? $this->recusaDoStatus($combustivel, $declarado);
        if ($recusa !== null) {
            return $recusa;
        }

        $combustivel->fill([
            'nome' => $declarado->nome,
            'codigo' => $declarado->codigo,
            'cor' => $declarado->cor,
            'preco_venda' => $declarado->precoVenda,
            'preco_custo' => $declarado->precoCusto,
            'ativo' => $declarado->ativo,
        ]);
        $combustivel->save();

        return $combustivel->refresh();
    }

    private function recusaDoCodigo(Combustivel $combustivel, CombustivelDeclarado $declarado): ?RecusaDoCadastro
    {
        $emUso = Combustivel::query()
            ->where('codigo', $declarado->codigo)
            ->when($combustivel->exists, fn ($consulta) => $consulta->whereKeyNot($combustivel->id))
            ->exists();
        if ($emUso) {
            return self::codigoRepetido();
        }

        $trocaCodigo = $combustivel->exists && $combustivel->codigo !== $declarado->codigo;

        return $trocaCodigo && $this->temHistorico($combustivel->id)
            ? new RecusaDoCadastro('codigo_travado', 'Este combustível já tem venda ou compra lançada e não pode trocar de código.')
            : null;
    }

    private function recusaDoStatus(Combustivel $combustivel, CombustivelDeclarado $declarado): ?RecusaDoCadastro
    {
        $desativa = ! $declarado->ativo && $combustivel->exists;

        return $desativa && Bico::query()->where('combustivel_id', $combustivel->id)->where('ativo', true)->exists()
            ? new RecusaDoCadastro('combustivel_com_bicos_ativos', 'Desative os bicos deste combustível antes de desativá-lo.')
            : null;
    }

    private function temHistorico(int $combustivelId): bool
    {
        return DB::table('Leitura')->where('combustivel_id', $combustivelId)->exists()
            || DB::table('Compra')->where('combustivel_id', $combustivelId)->exists();
    }

    private static function codigoRepetido(): RecusaDoCadastro
    {
        return new RecusaDoCadastro('codigo_repetido', 'Já existe um combustível com este código neste posto (mesmo desativado).');
    }
}
