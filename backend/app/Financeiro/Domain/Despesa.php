<?php

declare(strict_types=1);

namespace App\Financeiro\Domain;

use App\Compartilhado\PertenceAoPosto;
use Illuminate\Database\Eloquent\Model;

/**
 * Tabela "Despesa" (banco/init/01-esquema-base.sql). É a autoridade do rateio do lucro: a
 * Agregação soma `valor` por `data` no mês civil (competência). Por isso `data` e `valor` são
 * gravados exatamente como a tela os manda — a regra de qual data usar mora na tela.
 * `chave_lancamento`/`ordem_no_lancamento` (14-despesa-pela-api.sql) são a idempotência do
 * lançamento pela API. Só `created_at`.
 *
 * @property int $id
 * @property string $descricao
 * @property string|null $categoria
 * @property int|null $categoria_id
 * @property string $valor
 * @property string $data
 * @property string|null $status
 * @property bool $recorrente
 * @property string|null $data_pagamento
 * @property string|null $observacoes
 * @property string|null $chave_lancamento
 * @property int|null $ordem_no_lancamento
 * @property int|null $posto_id
 */
final class Despesa extends Model
{
    use PertenceAoPosto;

    public const UPDATED_AT = null;

    protected $table = 'Despesa';

    /** @var list<string> */
    protected $fillable = [
        'descricao', 'categoria', 'categoria_id', 'valor', 'data', 'status', 'recorrente',
        'data_pagamento', 'observacoes', 'chave_lancamento', 'ordem_no_lancamento', 'posto_id',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
            'recorrente' => 'boolean',
        ];
    }
}
