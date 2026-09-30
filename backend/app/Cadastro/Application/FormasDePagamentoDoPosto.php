<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\FormaPagamento;
use App\Cadastro\Domain\RecusaDoCadastro;
use App\Compartilhado\PostoAtual;
use Closure;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Formas de pagamento do posto em foco ({@see PostoAtual}) pela tela Configurações (#103).
 *
 * Porte do que a tela fazia no Supabase (`useFormaPagamento` + `formaPagamentoService`): criar e
 * editar nome, tipo, taxa e status; "Excluir" já era `ativo = false` e continua sendo. O que muda
 * por ser multi-tenant: o posto é o da rota (o INSERT caía no posto 1 sem posto ativo) e forma de
 * outro posto é 404. O nome é único no posto, inclusive entre inativas
 * (`FormaPagamento_nome_posto_unique`), e o repetido volta como recusa, não 500.
 *
 * A taxa entra na conta do Fechamento pela forma, e o `Recebimento` não guarda a taxa: mudar a taxa
 * vale também para os dias já salvos — é o comportamento de antes, que este porte não muda.
 */
final readonly class FormasDePagamentoDoPosto
{
    public function cadastrar(FormaDePagamentoDeclarada $declarada): FormaPagamento|RecusaDoCadastro
    {
        return $this->transacao(fn (): FormaPagamento|RecusaDoCadastro => $this->grava(new FormaPagamento, $declarada)) ?? self::nomeRepetido();
    }

    public function editar(int $formaId, FormaDePagamentoDeclarada $declarada): FormaPagamento|RecusaDoCadastro|null
    {
        return $this->transacao(function () use ($formaId, $declarada): FormaPagamento|RecusaDoCadastro|null {
            $forma = FormaPagamento::query()->whereKey($formaId)->lockForUpdate()->first();

            return $forma === null ? null : $this->grava($forma, $declarada);
        });
    }

    /** @param  Closure(): (FormaPagamento|RecusaDoCadastro|null)  $escrita */
    private function transacao(Closure $escrita): FormaPagamento|RecusaDoCadastro|null
    {
        try {
            return DB::transaction($escrita);
        } catch (UniqueConstraintViolationException) {
            return self::nomeRepetido();
        }
    }

    private function grava(FormaPagamento $forma, FormaDePagamentoDeclarada $declarada): FormaPagamento|RecusaDoCadastro
    {
        $emUso = FormaPagamento::query()
            ->where('nome', $declarada->nome)
            ->when($forma->exists, fn ($consulta) => $consulta->whereKeyNot($forma->id))
            ->exists();
        if ($emUso) {
            return self::nomeRepetido();
        }

        $forma->fill(['nome' => $declarada->nome, 'tipo' => $declarada->tipo, 'taxa' => $declarada->taxa, 'ativo' => $declarada->ativo]);
        $forma->save();

        return $forma->refresh();
    }

    private static function nomeRepetido(): RecusaDoCadastro
    {
        return new RecusaDoCadastro('nome_repetido', 'Já existe uma forma de pagamento com este nome neste posto (mesmo desativada).');
    }
}
