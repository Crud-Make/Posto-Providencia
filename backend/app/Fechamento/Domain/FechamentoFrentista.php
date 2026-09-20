<?php

declare(strict_types=1);

namespace App\Fechamento\Domain;

use App\Compartilhado\PertenceAoPosto;
use App\Compartilhado\Posto;
use Database\Factories\FechamentoFrentistaFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Tabela "FechamentoFrentista" do esquema de produção (banco/init/01-esquema-base.sql:237-256) —
 * a sessão de um frentista dentro do dia. Só leitura nesta fatia.
 *
 * Os 7 baldes (`valor_dinheiro`, `valor_moedas`, `valor_pix`, `valor_cartao` legado,
 * `valor_cartao_debito`, `valor_cartao_credito`, `valor_nota`, `baratao`), `encerrante`,
 * `valor_conferido` e `diferenca_calculada` são calculados no cliente por `@posto/utils` e aqui
 * só se serializam como string decimal; nenhuma conta neste model. `data_hora_envio` tem
 * DEFAULT now() no banco (:254) e é o carimbo do envio do PWA — um reINSERT o perde (decisão
 * pendente (c) do Design Doc). `frentista_id` fica inteiro: Frentista é de Cadastro (CA-7).
 * Unique `(fechamento_id, frentista_id)` em :761.
 *
 * @property int $id
 * @property int $fechamento_id
 * @property int $frentista_id
 * @property string $valor_cartao
 * @property string $valor_nota
 * @property string $valor_pix
 * @property string $valor_dinheiro
 * @property string $valor_conferido
 * @property ?string $observacoes
 * @property ?string $encerrante
 * @property ?string $baratao
 * @property ?string $diferenca_calculada
 * @property ?string $valor_cartao_debito
 * @property ?string $valor_cartao_credito
 * @property int|null $posto_id
 * @property ?string $baratencia
 * @property ?Carbon $data_hora_envio
 * @property string $valor_moedas
 */
final class FechamentoFrentista extends Model
{
    /** @use HasFactory<FechamentoFrentistaFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'FechamentoFrentista';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'fechamento_id', 'frentista_id', 'valor_cartao', 'valor_nota', 'valor_pix', 'valor_dinheiro',
        'valor_conferido', 'observacoes', 'encerrante', 'baratao', 'diferenca_calculada',
        'valor_cartao_debito', 'valor_cartao_credito', 'posto_id', 'baratencia', 'data_hora_envio',
        'valor_moedas',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'valor_cartao' => 'decimal:2',
            'valor_nota' => 'decimal:2',
            'valor_pix' => 'decimal:2',
            'valor_dinheiro' => 'decimal:2',
            'valor_conferido' => 'decimal:2',
            'encerrante' => 'decimal:2',
            'baratao' => 'decimal:2',
            'diferenca_calculada' => 'decimal:2',
            'valor_cartao_debito' => 'decimal:2',
            'valor_cartao_credito' => 'decimal:2',
            'baratencia' => 'decimal:2',
            'valor_moedas' => 'decimal:2',
            'data_hora_envio' => 'datetime',
        ];
    }

    /** @return BelongsTo<Fechamento, $this> */
    public function fechamento(): BelongsTo
    {
        return $this->belongsTo(Fechamento::class, 'fechamento_id');
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }

    protected static function newFactory(): FechamentoFrentistaFactory
    {
        return FechamentoFrentistaFactory::new();
    }
}
