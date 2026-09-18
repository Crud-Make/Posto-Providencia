<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Compartilhado\PertenceAoPosto;
use Database\Factories\TanqueFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Tabela "Tanque" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property string $nome
 * @property int $combustivel_id
 * @property string $capacidade
 * @property string $estoque_atual
 * @property ?bool $ativo
 * @property int|null $posto_id
 * @property Carbon|null $created_at
 */
final class Tanque extends Model
{
    /** @use HasFactory<TanqueFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'Tanque';

    public const UPDATED_AT = null;

    /** @var list<string> */
    protected $fillable = ['nome', 'combustivel_id', 'capacidade', 'estoque_atual', 'ativo', 'posto_id'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'capacidade' => 'decimal:2',
            'estoque_atual' => 'decimal:2',
            'ativo' => 'boolean',
        ];
    }

    /** @return BelongsTo<Combustivel, $this> */
    public function combustivel(): BelongsTo
    {
        return $this->belongsTo(Combustivel::class);
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

    protected static function newFactory(): TanqueFactory
    {
        return TanqueFactory::new();
    }
}
