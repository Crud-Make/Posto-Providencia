<?php

declare(strict_types=1);

namespace App\Fechamento\Domain;

/**
 * A gravação do dia foi RECUSADA — e a recusa é um VALOR, não uma exceção.
 *
 * O módulo Fechamento tem zero `throw` de regra de negócio e continua assim: o Command devolve
 * `Fechamento|RecusaDaGravacao`, o controller traduz para 422 com `{ erro: { codigo, mensagem,
 * campos? } }` (Design Doc §5.2). Exceção fica para o que é falha de infraestrutura (FK, conexão),
 * que a transação desfaz.
 *
 * Códigos que existem hoje: `fora_da_janela` ({@see JanelaDeEscrita}) e `totais_inconsistentes`
 * ({@see TotaisDeclarados}). `corpo_invalido` é do FormRequest, antes de chegar aqui.
 */
final readonly class RecusaDaGravacao
{
    /**
     * @param  string  $codigo  identificador estável para o cliente decidir o que mostrar
     * @param  string  $mensagem  texto em pt-BR, para o dono ler
     * @param  array<string, list<string>>|null  $campos  campo => mensagens, quando a recusa aponta campo
     */
    public function __construct(
        public string $codigo,
        public string $mensagem,
        public ?array $campos = null,
    ) {}
}
