<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\RecusaDoCadastro;
use App\Cadastro\Domain\Tanque;
use App\Compartilhado\PostoAtual;
use Closure;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Cadastro de bicos do posto em foco ({@see PostoAtual}) pelo painel (#153) — é por aqui que o
 * gerente monta a pista (o Posto BR tem 24 bicos) sem o seed ser reescrito.
 *
 * Regras, cada uma com o porquê:
 * - bomba, combustível e tanque têm de ser DO POSTO: a busca passa pelo escopo do `PertenceAoPosto`,
 *   então o de outro posto simplesmente não existe aqui (422, nunca vazamento);
 * - o tanque é do combustível do bico: bico de gasolina puxando do tanque de etanol desconta o
 *   estoque errado;
 * - a bomba de um bico ativo está ativa;
 * - o número é único entre os bicos ATIVOS do posto (é por ele que o frentista lê o encerrante e a
 *   tela ordena); o unique do banco `(bomba_id, numero)` vale também para os inativos e volta como
 *   a mesma recusa;
 * - bico com leitura lançada NÃO troca de combustível: `Leitura` guarda o próprio combustível e
 *   preço, mas a aba Fechamento Mensal dá nome às leituras antigas pelo catálogo do bico
 *   (`bico.api.ts`), e trocar reescreveria o relatório passado. Para mudar, desativa e cria outro;
 * - nada se apaga: desativar é `ativo = false`.
 *
 * `Leitura` é do módulo Fechamento: lida por query builder, sem model (CA-7).
 */
final readonly class BicosDoPosto
{
    public function cadastrar(BicoDeclarado $declarado): Bico|RecusaDoCadastro
    {
        return $this->transacao(fn (): Bico|RecusaDoCadastro => $this->grava(new Bico, $declarado)) ?? self::numeroRepetido();
    }

    public function editar(int $bicoId, BicoDeclarado $declarado): Bico|RecusaDoCadastro|null
    {
        return $this->transacao(function () use ($bicoId, $declarado): Bico|RecusaDoCadastro|null {
            $bico = Bico::query()->whereKey($bicoId)->lockForUpdate()->first();

            return $bico === null ? null : $this->grava($bico, $declarado);
        });
    }

    /**
     * A escrita numa transação; o unique `(bomba_id, numero)` do banco volta como recusa, não 500.
     *
     * @param  Closure(): (Bico|RecusaDoCadastro|null)  $escrita
     */
    private function transacao(Closure $escrita): Bico|RecusaDoCadastro|null
    {
        try {
            return DB::transaction($escrita);
        } catch (UniqueConstraintViolationException) {
            return self::numeroRepetido();
        }
    }

    private function grava(Bico $bico, BicoDeclarado $declarado): Bico|RecusaDoCadastro
    {
        $recusa = $this->recusaDoCatalogo($declarado) ?? $this->recusaDoBico($bico, $declarado);
        if ($recusa !== null) {
            return $recusa;
        }

        $bico->fill([
            'numero' => $declarado->numero,
            'bomba_id' => $declarado->bombaId,
            'combustivel_id' => $declarado->combustivelId,
            'tanque_id' => $declarado->tanqueId,
            'ativo' => $declarado->ativo,
        ]);
        $bico->save();

        return $bico->load(['bomba', 'combustivel', 'tanque']);
    }

    /** Bomba, combustível e tanque do posto, e casados entre si. */
    private function recusaDoCatalogo(BicoDeclarado $declarado): ?RecusaDoCadastro
    {
        $bomba = Bomba::query()->find($declarado->bombaId);
        if ($bomba === null || ($declarado->ativo && ! $bomba->ativo)) {
            return new RecusaDoCadastro('bomba_invalida', 'A bomba não existe neste posto ou está desativada.');
        }

        if (! Combustivel::query()->whereKey($declarado->combustivelId)->exists()) {
            return new RecusaDoCadastro('combustivel_invalido', 'O combustível não existe neste posto.');
        }

        $tanqueCasa = Tanque::query()->whereKey($declarado->tanqueId)->where('combustivel_id', $declarado->combustivelId)->exists();

        return $tanqueCasa ? null : new RecusaDoCadastro('tanque_invalido', 'O tanque não existe neste posto ou é de outro combustível.');
    }

    /** Número livre entre os ativos, e combustível travado depois da primeira leitura. */
    private function recusaDoBico(Bico $bico, BicoDeclarado $declarado): ?RecusaDoCadastro
    {
        $numeroEmUso = $declarado->ativo && Bico::query()
            ->where('numero', $declarado->numero)
            ->where('ativo', true)
            ->when($bico->exists, fn ($consulta) => $consulta->whereKeyNot($bico->id))
            ->exists();
        if ($numeroEmUso) {
            return self::numeroRepetido();
        }

        $trocaCombustivel = $bico->exists && $bico->combustivel_id !== $declarado->combustivelId;
        if ($trocaCombustivel && DB::table('Leitura')->where('bico_id', $bico->id)->exists()) {
            return new RecusaDoCadastro(
                'combustivel_travado',
                'Este bico já tem leitura lançada e não pode trocar de combustível: desative-o e cadastre outro.',
            );
        }

        return null;
    }

    private static function numeroRepetido(): RecusaDoCadastro
    {
        return new RecusaDoCadastro('numero_repetido', 'Já existe um bico com este número neste posto (ou nesta bomba, desativado).');
    }
}
