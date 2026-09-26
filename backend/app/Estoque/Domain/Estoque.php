<?php

declare(strict_types=1);

namespace App\Estoque\Domain;

use App\Compartilhado\PertenceAoPosto;
use App\Compartilhado\Posto;
use Database\Factories\EstoqueFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Tabela "Estoque" — quanto há hoje de cada combustível, por posto.
 *
 * Uma linha por (`posto_id`, `combustivel_id`). `combustivel_id` fica inteiro: `Combustivel` é
 * de `Cadastro`, e nenhum módulo depende de outro (CA-7).
 *
 * `quantidade_atual`, `custo_medio` e `capacidade_tanque` são volume e dinheiro: saem como string
 * decimal pelo cast, nunca float.
 *
 * @property int $id
 * @property int $combustivel_id
 * @property string $quantidade_atual
 * @property string $custo_medio
 * @property string $capacidade_tanque
 * @property Carbon $ultima_atualizacao
 * @property int|null $posto_id
 */
final class Estoque extends Model
{
    /** @use HasFactory<EstoqueFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'Estoque';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['combustivel_id', 'quantidade_atual', 'custo_medio', 'capacidade_tanque', 'ultima_atualizacao', 'posto_id'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'quantidade_atual' => 'decimal:3',
            'custo_medio' => 'decimal:2',
            'capacidade_tanque' => 'decimal:3',
            'ultima_atualizacao' => 'datetime',
        ];
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }

    protected static function newFactory(): EstoqueFactory
    {
        return EstoqueFactory::new();
    }
}
