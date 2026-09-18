<?php

declare(strict_types=1);

namespace App\Compartilhado;

/**
 * Qual posto está em foco nesta requisição.
 *
 * Registrado como `scoped` no container (um por requisição/job). A rota `/api/postos/{posto}/…`
 * define; o trait {@see PertenceAoPosto} lê. Sem posto definido, nenhum escopo é aplicado —
 * é o modo dos scripts e dos testes que montam dado em mais de um posto.
 *
 * DECISÃO 5 do Design Doc: hoje é um posto por instalação (`posto_id = 1`), mas o filtro existe
 * desde já para um banco compartilhado ser configuração, não migração.
 */
final class PostoAtual
{
    private ?int $id = null;

    public function definir(int $id): void
    {
        $this->id = $id;
    }

    public function limpar(): void
    {
        $this->id = null;
    }

    public function id(): ?int
    {
        return $this->id;
    }

    public function definido(): bool
    {
        return $this->id !== null;
    }
}
