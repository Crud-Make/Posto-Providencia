<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use Carbon\CarbonImmutable;

/**
 * O que o formulário "Novo/Editar Frentista" do painel manda (#103, tela Frentistas): os três campos
 * que a tela edita hoje — nome, admissão e status. CPF, telefone, turno, `user_id` e foto não estão
 * no formulário e não entram aqui: editar não os toca, criar os deixa `null` (como o INSERT do
 * Supabase deixava). O posto NÃO está aqui de propósito: vem da rota.
 */
final readonly class FrentistaDeclarado
{
    /** @param  CarbonImmutable  $dataAdmissao  meia-noite UTC do dia escolhido */
    public function __construct(
        public string $nome,
        public CarbonImmutable $dataAdmissao,
        public bool $ativo,
    ) {}
}
