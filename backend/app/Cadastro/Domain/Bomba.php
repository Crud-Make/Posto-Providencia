<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Compartilhado\PertenceAoPosto;
use Database\Factories\BombaFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Tabela "Bomba" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property string $nome
 * @property ?string $localizacao
 * @property bool $ativo
 * @property int|null $posto_id
 */
final class Bomba extends Model
{
    /** @use HasFactory<BombaFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'Bomba';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['nome', 'localizacao', 'ativo', 'posto_id'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
        ];
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

    protected static function newFactory(): BombaFactory
    {
        return BombaFactory::new();
    }
}
