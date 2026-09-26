<?php

declare(strict_types=1);

namespace App\Fechamento\Domain;

use Database\Factories\RecebimentoFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tabela "Recebimento" do esquema de produção (banco/init/01-esquema-base.sql:437-444) — o
 * Caixa Geral do dia, uma linha por forma de pagamento. Só leitura nesta fatia.
 *
 * **Não tem `posto_id`**, então não usa `PertenceAoPosto`: o posto chega pelo `Fechamento`
 * pai, e {@see self::scopeDoPostoAtual()} é a porta para consultar só o posto em foco —
 * `whereHas('fechamento')` herda o escopo global do pai. `forma_pagamento_id` e
 * `maquininha_id` ficam inteiros: FormaPagamento e Maquininha são de Cadastro (CA-7).
 *
 * @property int $id
 * @property int $fechamento_id
 * @property int $forma_pagamento_id
 * @property ?int $maquininha_id
 * @property string $valor
 * @property ?string $observacoes
 */
final class Recebimento extends Model
{
    /** @use HasFactory<RecebimentoFactory> */
    use HasFactory;

    protected $table = 'Recebimento';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['fechamento_id', 'forma_pagamento_id', 'maquininha_id', 'valor', 'observacoes'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Fechamento, $this> */
    public function fechamento(): BelongsTo
    {
        return $this->belongsTo(Fechamento::class, 'fechamento_id');
    }

    /**
     * Só os recebimentos cujo Fechamento é do posto atual (escopo `posto` de {@see Fechamento}).
     * Sem PostoAtual definido, não filtra — o mesmo comportamento de PertenceAoPosto.
     *
     * @param  Builder<Recebimento>  $consulta
     * @return Builder<Recebimento>
     */
    public function scopeDoPostoAtual(Builder $consulta): Builder
    {
        return $consulta->whereHas('fechamento');
    }

    protected static function newFactory(): RecebimentoFactory
    {
        return RecebimentoFactory::new();
    }
}
