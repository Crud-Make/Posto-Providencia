<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\FormaPagamento;
use App\Cadastro\Domain\Fornecedor;
use App\Cadastro\Domain\Frentista;
use App\Cadastro\Domain\Maquininha;
use App\Cadastro\Domain\Tanque;
use App\Cadastro\Domain\Turno;
use App\Compartilhado\PostoAtual;
use Illuminate\Database\Eloquent\Collection;

/**
 * Consultas de leitura do cadastro do posto em foco ({@see PostoAtual}).
 *
 * O escopo por posto vem do trait `PertenceAoPosto` dos models; aqui só se decide ordem e
 * eager loading (nada de N+1 — CLAUDE.md §5). Escrita de cadastro é issue própria.
 */
final class CatalogoDoPosto
{
    /** @return Collection<int, Combustivel> */
    public function combustiveis(): Collection
    {
        return Combustivel::query()->orderBy('nome')->get();
    }

    /** @return Collection<int, Tanque> */
    public function tanques(): Collection
    {
        return Tanque::query()->with('combustivel')->orderBy('nome')->get();
    }

    /** @return Collection<int, Bomba> */
    public function bombas(): Collection
    {
        return Bomba::query()->orderBy('nome')->get();
    }

    /** @return Collection<int, Bico> */
    public function bicos(): Collection
    {
        return Bico::query()->with(['bomba', 'combustivel', 'tanque'])->orderBy('numero')->get();
    }

    /** @return Collection<int, Turno> */
    public function turnos(): Collection
    {
        return Turno::query()->orderBy('horario_inicio')->get();
    }

    /** @return Collection<int, Frentista> */
    public function frentistas(): Collection
    {
        return Frentista::query()->with('turno')->orderBy('nome')->get();
    }

    /** @return Collection<int, FormaPagamento> */
    public function formasPagamento(): Collection
    {
        return FormaPagamento::query()->orderBy('nome')->get();
    }

    /** @return Collection<int, Maquininha> */
    public function maquininhas(): Collection
    {
        return Maquininha::query()->orderBy('nome')->get();
    }

    /** @return Collection<int, Fornecedor> */
    public function fornecedores(): Collection
    {
        return Fornecedor::query()->orderBy('nome')->get();
    }
}
