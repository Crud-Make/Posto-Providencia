<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Compartilhado\PertenceAoPosto;
use App\Compartilhado\Posto;
use Database\Factories\BicoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tabela "Bico" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property int $numero
 * @property int $bomba_id
 * @property int $combustivel_id
 * @property ?int $tanque_id
 * @property bool $ativo
 * @property int|null $posto_id
 */
final class Bico extends Model
{
    /** @use HasFactory<BicoFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'Bico';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['numero', 'bomba_id', 'combustivel_id', 'tanque_id', 'ativo', 'posto_id'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
        ];
    }

    /** @return BelongsTo<Bomba, $this> */
    public function bomba(): BelongsTo
    {
        return $this->belongsTo(Bomba::class);
    }

    /** @return BelongsTo<Combustivel, $this> */
    public function combustivel(): BelongsTo
    {
        return $this->belongsTo(Combustivel::class);
    }

    /** @return BelongsTo<Tanque, $this> */
    public function tanque(): BelongsTo
    {
        return $this->belongsTo(Tanque::class);
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }

    protected static function newFactory(): BicoFactory
    {
        return BicoFactory::new();
    }
}
