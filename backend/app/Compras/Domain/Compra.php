<?php

declare(strict_types=1);

namespace App\Compras\Domain;

use App\Compartilhado\PertenceAoPosto;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Tabela "Compra" (banco/init/01-esquema-base.sql:136) — uma compra de combustível de um fornecedor.
 *
 * `combustivel_id` e `fornecedor_id` ficam inteiros: os dois são de Cadastro (CA-7). `data` é
 * `timestamptz` gravado em 00:00 UTC, como o Supabase gravava a data pura `AAAA-MM-DD` na sessão
 * UTC. Litros e dinheiro saem como string decimal pelo cast, nunca float. `chave_compra` é a
 * idempotência do "Salvar" do painel (banco/init/08-compra-pela-api.sql), NULL nas linhas antigas.
 *
 * @property int $id
 * @property Carbon $data
 * @property int $combustivel_id
 * @property int $fornecedor_id
 * @property string $quantidade_litros
 * @property string $valor_total
 * @property string $custo_por_litro
 * @property ?string $observacoes
 * @property ?int $posto_id
 * @property ?string $chave_compra
 */
final class Compra extends Model
{
    use PertenceAoPosto;

    protected $table = 'Compra';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'data', 'combustivel_id', 'fornecedor_id', 'quantidade_litros', 'valor_total',
        'custo_por_litro', 'observacoes', 'posto_id', 'chave_compra',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'data' => 'datetime',
            'quantidade_litros' => 'decimal:2',
            'valor_total' => 'decimal:2',
            'custo_por_litro' => 'decimal:4',
        ];
    }
}
