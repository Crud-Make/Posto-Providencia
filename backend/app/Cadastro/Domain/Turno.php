<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Compartilhado\PertenceAoPosto;
use Database\Factories\TurnoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Tabela "Turno" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property string $nome
 * @property string $horario_inicio
 * @property string $horario_fim
 * @property bool $ativo
 * @property int|null $posto_id
 */
final class Turno extends Model
{
    /** @use HasFactory<TurnoFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'Turno';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['nome', 'horario_inicio', 'horario_fim', 'ativo', 'posto_id'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
        ];
    }

    /** @return HasMany<Frentista, $this> */
    public function frentistas(): HasMany
    {
        return $this->hasMany(Frentista::class);
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }

    protected static function newFactory(): TurnoFactory
    {
        return TurnoFactory::new();
    }
}
