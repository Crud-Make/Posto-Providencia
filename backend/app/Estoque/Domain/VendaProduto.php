<?php

declare(strict_types=1);

namespace App\Estoque\Domain;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Tabela "VendaProduto" (banco/init/01-esquema-base.sql:520) — uma linha por produto vendido.
 *
 * **Não tem `posto_id`**: o posto de uma venda é o do produto (e o do frentista). Por isso este model
 * não usa `PertenceAoPosto`; quem lê filtra pelo produto do posto (`Application\VendasDoFrentista`).
 * `frentista_id` fica inteiro: Frentista é de Cadastro (CA-7). `chave_venda` é a idempotência do
 * carrinho pela API (banco/init/05-venda-pelo-pwa.sql), NULL nas linhas antigas.
 *
 * @property int $id
 * @property int $frentista_id
 * @property int $produto_id
 * @property string $quantidade
 * @property string $valor_unitario
 * @property string $valor_total
 * @property Carbon $data
 * @property ?int $fechamento_frentista_id
 * @property ?string $chave_venda
 * @property-read Produto|null $produto
 */
final class VendaProduto extends Model
{
    protected $table = 'VendaProduto';

    public const CREATED_AT = 'created_at';

    public const UPDATED_AT = null;

    /** @var list<string> */
    protected $fillable = ['frentista_id', 'produto_id', 'quantidade', 'valor_unitario', 'valor_total', 'data', 'chave_venda'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'quantidade' => 'decimal:2',
            'valor_unitario' => 'decimal:2',
            'valor_total' => 'decimal:2',
            'data' => 'datetime',
        ];
    }

    /** @return BelongsTo<Produto, $this> */
    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class, 'produto_id');
    }
}
