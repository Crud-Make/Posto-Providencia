<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Compartilhado\PertenceAoPosto;
use App\Compartilhado\Posto;
use Database\Factories\CombustivelFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Tabela "Combustivel" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property string $nome
 * @property string $codigo
 * @property ?string $cor
 * @property bool $ativo
 * @property string $preco_venda
 * @property ?string $preco_custo
 * @property int|null $posto_id
 */
final class Combustivel extends Model
{
    /** @use HasFactory<CombustivelFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'Combustivel';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['nome', 'codigo', 'cor', 'ativo', 'preco_venda', 'preco_custo', 'posto_id'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
            'preco_venda' => 'decimal:2',
            'preco_custo' => 'decimal:4',
        ];
    }

    /** @return HasMany<Tanque, $this> */
    public function tanques(): HasMany
    {
        return $this->hasMany(Tanque::class);
    }

    /** @return HasMany<Bico, $this> */
    public function bicos(): HasMany
    {
        return $this->hasMany(Bico::class);
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }

    protected static function newFactory(): CombustivelFactory
    {
        return CombustivelFactory::new();
    }
}
