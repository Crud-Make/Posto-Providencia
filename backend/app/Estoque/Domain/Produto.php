<?php

declare(strict_types=1);

namespace App\Estoque\Domain;

use App\Compartilhado\PertenceAoPosto;
use Database\Factories\ProdutoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Tabela "Produto" (banco/init/01-esquema-base.sql:397) — a conveniência do posto (óleo, aditivo…),
 * que o frentista vende pelo PWA (#101, fatia 2).
 *
 * `preco_venda`/`preco_custo` são `numeric(10,2)`: saem como string decimal pelo cast, nunca float.
 * `estoque_atual` é inteiro. **A venda NÃO desconta `estoque_atual`** — nem pelo PWA de hoje (insert
 * cru em `VendaProduto`, sem trigger), nem pela API: é o comportamento mantido (pergunta 5 do Design
 * Doc `fechamento-frentista-api.md`).
 *
 * @property int $id
 * @property string $nome
 * @property ?string $codigo_barras
 * @property string $categoria
 * @property ?string $descricao
 * @property string $preco_custo
 * @property string $preco_venda
 * @property int $estoque_atual
 * @property int $estoque_minimo
 * @property string $unidade_medida
 * @property ?bool $ativo
 * @property int|null $posto_id
 */
final class Produto extends Model
{
    /** @use HasFactory<ProdutoFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'Produto';

    public const CREATED_AT = 'created_at';

    public const UPDATED_AT = 'updated_at';

    /** @var list<string> */
    protected $fillable = [
        'nome', 'codigo_barras', 'categoria', 'descricao', 'preco_custo', 'preco_venda', 'estoque_atual',
        'estoque_minimo', 'unidade_medida', 'ativo', 'posto_id',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'preco_custo' => 'decimal:2',
            'preco_venda' => 'decimal:2',
            'estoque_atual' => 'integer',
            'estoque_minimo' => 'integer',
            'ativo' => 'boolean',
        ];
    }

    protected static function newFactory(): ProdutoFactory
    {
        return ProdutoFactory::new();
    }
}
