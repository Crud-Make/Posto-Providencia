<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\Cnpj;
use App\Cadastro\Domain\Fornecedor;
use App\Cadastro\Domain\RecusaDoCadastro;
use App\Compartilhado\PostoAtual;
use Closure;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Cadastro de fornecedores do posto em foco ({@see PostoAtual}) pelo painel (#103).
 *
 * Achado do ensaio Jorro+BR (30/09/2026): o BR não tinha fornecedor e a API só LIA a lista, então
 * nenhuma compra podia ser registrada no posto novo.
 *
 * - o CNPJ é conferido pelos DV (numérico ou alfanumérico) e guardado num formato só;
 * - o CNPJ é único no posto, inclusive entre inativos (`Fornecedor_cnpj_posto_id_key`); o repetido
 *   volta como recusa, não 500 — e a conferência compara sem máscara, porque há cadastro antigo
 *   gravado sem pontuação;
 * - desativar é `ativo: false`; as compras já lançadas seguem apontando para ele. Nada se apaga.
 */
final readonly class FornecedoresDoPosto
{
    public function cadastrar(FornecedorDeclarado $declarado): Fornecedor|RecusaDoCadastro
    {
        return $this->transacao(fn (): Fornecedor|RecusaDoCadastro => $this->grava(new Fornecedor, $declarado)) ?? self::cnpjRepetido();
    }

    public function editar(int $fornecedorId, FornecedorDeclarado $declarado): Fornecedor|RecusaDoCadastro|null
    {
        return $this->transacao(function () use ($fornecedorId, $declarado): Fornecedor|RecusaDoCadastro|null {
            $fornecedor = Fornecedor::query()->whereKey($fornecedorId)->lockForUpdate()->first();

            return $fornecedor === null ? null : $this->grava($fornecedor, $declarado);
        });
    }

    /** @param  Closure(): (Fornecedor|RecusaDoCadastro|null)  $escrita */
    private function transacao(Closure $escrita): Fornecedor|RecusaDoCadastro|null
    {
        try {
            return DB::transaction($escrita);
        } catch (UniqueConstraintViolationException) {
            return self::cnpjRepetido();
        }
    }

    private function grava(Fornecedor $fornecedor, FornecedorDeclarado $declarado): Fornecedor|RecusaDoCadastro
    {
        $cnpj = Cnpj::de($declarado->cnpj);
        if ($cnpj === null) {
            return new RecusaDoCadastro('cnpj_invalido', 'CNPJ inválido: confira os números (e as letras, no CNPJ novo).');
        }
        if ($this->cnpjEmUso($fornecedor, $cnpj)) {
            return self::cnpjRepetido();
        }

        $fornecedor->fill([
            'nome' => $declarado->nome,
            'cnpj' => $cnpj->formatado,
            'contato' => $declarado->contato,
            'ativo' => $declarado->ativo,
        ]);
        $fornecedor->save();

        return $fornecedor->refresh();
    }

    private function cnpjEmUso(Fornecedor $fornecedor, Cnpj $cnpj): bool
    {
        return Fornecedor::query()
            ->whereRaw("regexp_replace(upper(cnpj), '[^0-9A-Z]', '', 'g') = ?", [Cnpj::limpo($cnpj->formatado)])
            ->when($fornecedor->exists, fn ($consulta) => $consulta->whereKeyNot($fornecedor->id))
            ->exists();
    }

    private static function cnpjRepetido(): RecusaDoCadastro
    {
        return new RecusaDoCadastro('cnpj_repetido', 'Já há um fornecedor com este CNPJ neste posto (ativo ou inativo).');
    }
}
