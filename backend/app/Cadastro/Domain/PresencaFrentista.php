<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Compartilhado\PertenceAoPosto;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * "Visto por último" de cada frentista (banco/init/01-esquema-base.sql, `PresencaFrentista`): o PWA
 * do frentista grava o sinal de vida, o card do Dashboard mostra quem está no posto. Uma linha por
 * frentista (a chave é `frentista_id`), escopada por posto.
 *
 * @property int $frentista_id
 * @property ?int $posto_id
 * @property Carbon $visto_em
 * @property-read ?Frentista $frentista
 */
final class PresencaFrentista extends Model
{
    use PertenceAoPosto;

    protected $table = 'PresencaFrentista';

    protected $primaryKey = 'frentista_id';

    public $incrementing = false;

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['frentista_id', 'posto_id', 'visto_em'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['visto_em' => 'datetime'];
    }

    /** @return BelongsTo<Frentista, $this> */
    public function frentista(): BelongsTo
    {
        return $this->belongsTo(Frentista::class);
    }
}
