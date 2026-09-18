<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Compartilhado\PertenceAoPosto;
use Database\Factories\MaquininhaFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tabela "Maquininha" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property string $nome
 * @property ?string $operadora
 * @property ?string $taxa
 * @property bool $ativo
 * @property int|null $posto_id
 */
final class Maquininha extends Model
{
    /** @use HasFactory<MaquininhaFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'Maquininha';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['nome', 'operadora', 'taxa', 'ativo', 'posto_id'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'taxa' => 'decimal:2',
            'ativo' => 'boolean',
        ];
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }

    protected static function newFactory(): MaquininhaFactory
    {
        return MaquininhaFactory::new();
    }
}
