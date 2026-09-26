<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use Carbon\CarbonImmutable;

/**
 * O fechamento de turno que o frentista mandou pelo PWA (#101), já com a forma conferida pelo
 * FormRequest. É o `payload` que o `App.tsx` monta hoje, MENOS o que o servidor decide sozinho:
 * `fechamento_id` (o pai do dia, que o servidor acha ou cria), `frentista_id` (do token) e
 * `posto_id` (da rota).
 *
 * Os valores são os que o cliente calculou com `@posto/utils` (`conferido`, `diferenca`): o
 * servidor grava como veio e não refaz a conta da sessão (Design Doc §2, DECISÃO 1).
 */
final readonly class EnvioDeclarado
{
    /** As colunas de dinheiro do envio, as mesmas 11 do payload do PWA (`App.tsx`, `handleSubmit`). */
    public const array DINHEIRO = [
        'encerrante', 'valor_pix', 'valor_dinheiro', 'valor_moedas', 'baratao', 'valor_nota',
        'valor_cartao_debito', 'valor_cartao_credito', 'valor_cartao', 'valor_conferido', 'diferenca_calculada',
    ];

    /**
     * @param  CarbonImmutable  $dia  o dia do fechamento, em UTC
     * @param  string  $chave  chave de idempotência (UUID) que o PWA gerou para esta tentativa
     * @param  array<string, numeric-string>  $valores  coluna de {@see self::DINHEIRO} => string decimal
     */
    public function __construct(
        public CarbonImmutable $dia,
        public string $chave,
        public array $valores,
        public ?string $observacoes,
    ) {}
}
