<?php

declare(strict_types=1);

namespace App\Estoque\Domain;

use App\Compartilhado\PertenceAoPosto;
use App\Estoque\Application\RegistraMovimentacaoDeEstoque;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Tabela "MovimentacaoEstoque" (banco/init/01-esquema-base.sql:327) — a "Registrar Movimentação" da
 * tela Produtos e Estoque: uma linha por entrada, saída ou ajuste de um produto da loja.
 *
 * Sem trigger e sem CHECK no banco: quem mexe em `Produto.estoque_atual` e `preco_custo` é a gravação
 * ({@see RegistraMovimentacaoDeEstoque}). **Não tem coluna de valor unitário**
 * — o custo da entrada só vive no novo `preco_custo` do produto. `chave_movimentacao` é a idempotência
 * da API (banco/init/12-estoque-de-produtos-pela-api.sql), NULL nas linhas antigas.
 *
 * @property int $id
 * @property ?int $produto_id
 * @property string $tipo
 * @property int $quantidade
 * @property ?Carbon $data
 * @property ?string $responsavel
 * @property ?string $observacao
 * @property ?int $posto_id
 * @property ?string $chave_movimentacao
 */
final class MovimentacaoEstoque extends Model
{
    use PertenceAoPosto;

    protected $table = 'MovimentacaoEstoque';

    public const CREATED_AT = 'created_at';

    public const UPDATED_AT = null;

    /** @var list<string> */
    protected $fillable = ['produto_id', 'tipo', 'quantidade', 'data', 'observacao', 'posto_id', 'chave_movimentacao'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'quantidade' => 'integer',
            'data' => 'datetime',
        ];
    }
}
