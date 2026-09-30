<?php

declare(strict_types=1);

namespace App\Fechamento\Domain;

use App\Compartilhado\Enums\StatusFechamento;
use App\Compartilhado\PertenceAoPosto;
use App\Compartilhado\Posto;
use Database\Factories\FechamentoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Tabela "Fechamento" do esquema de produção (banco/init/01-esquema-base.sql:217-236) — o pai do
 * dia. Só leitura nesta fatia (docs/design/fechamento-diario-api.md, P3).
 *
 * `total_vendas` e `diferenca` são NULL até o dia ser apurado (invariante I8): NULL é "não
 * apurado", 0 seria "bateu". `data` é timestamptz gravado às 00:00Z e o dia é o dia em UTC (I9).
 * `usuario_id` e `turno_id` ficam como inteiros: Usuario é de Pessoas e Turno de Cadastro, e
 * módulo não importa Domain de outro (CA-7).
 *
 * `lucro_*`, `custo_combustiveis`, `taxas_pagamento` e `margem_*` são colunas carimbadas que o
 * painel nunca grava (memória card-receitas-despesas-le-coluna-carimbada); ficam fora do
 * `$fillable` de propósito. Fora de produção, passá-las lança (`preventSilentlyDiscardingAttributes`,
 * AppServiceProvider.php:40-43) — é o teste que pega. Em produção a trava fica desligada e a
 * coluna some do INSERT em silêncio, como qualquer atributo fora do `$fillable`.
 *
 * @property int $id
 * @property Carbon $data
 * @property ?string $total_vendas
 * @property string $total_recebido
 * @property ?string $diferenca
 * @property StatusFechamento $status
 * @property ?string $observacoes
 * @property int $usuario_id
 * @property ?int $turno_id
 * @property int|null $posto_id
 * @property ?string $lucro_bruto
 * @property ?string $custo_combustiveis
 * @property ?string $taxas_pagamento
 * @property ?string $lucro_liquido
 * @property ?string $margem_bruta_percentual
 * @property ?string $margem_liquida_percentual
 * @property Carbon $createdAt
 * @property Carbon $updatedAt
 */
final class Fechamento extends Model
{
    /** @use HasFactory<FechamentoFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'Fechamento';

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    /** @var list<string> */
    protected $fillable = [
        'data', 'total_vendas', 'total_recebido', 'diferenca', 'status', 'observacoes',
        'usuario_id', 'turno_id', 'posto_id',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'data' => 'datetime',
            'total_vendas' => 'decimal:2',
            'total_recebido' => 'decimal:2',
            'diferenca' => 'decimal:2',
            'status' => StatusFechamento::class,
            'lucro_bruto' => 'decimal:2',
            'custo_combustiveis' => 'decimal:2',
            'taxas_pagamento' => 'decimal:2',
            'lucro_liquido' => 'decimal:2',
            'margem_bruta_percentual' => 'decimal:2',
            'margem_liquida_percentual' => 'decimal:2',
        ];
    }

    /** @return HasMany<FechamentoFrentista, $this> */
    public function frentistas(): HasMany
    {
        return $this->hasMany(FechamentoFrentista::class, 'fechamento_id');
    }

    /** @return HasMany<Recebimento, $this> */
    public function recebimentos(): HasMany
    {
        return $this->hasMany(Recebimento::class, 'fechamento_id');
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }

    protected static function newFactory(): FechamentoFactory
    {
        return FechamentoFactory::new();
    }

    /**
     * O turno em que o dia de um posto é gravado: o primeiro turno DO PRÓPRIO POSTO.
     *
     * O posto não trabalha por turno — o dia é um só (I7): o turno do pai é só o tampão do unique
     * `(data, turno_id, posto_id)`. Até 30/09/2026 esse tampão era o turno 1 cravado, que é do Jorro;
     * no ensaio com o Posto BR o dia do BR nasceu apontando para um turno do Jorro. Agora cada posto
     * usa o seu (para o Jorro continua sendo o 1). Posto sem turno é erro de cadastro: lança em vez de
     * pegar o turno de outro posto.
     */
    public static function turnoDoPosto(int $postoId): int
    {
        $id = DB::table('Turno')->where('posto_id', $postoId)->orderBy('id')->value('id');

        return is_int($id) || (is_string($id) && ctype_digit($id))
            ? (int) $id
            : throw new RuntimeException("O posto {$postoId} não tem turno cadastrado: o dia precisa de um turno do próprio posto.");
    }
}
