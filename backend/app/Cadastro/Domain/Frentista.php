<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Compartilhado\PertenceAoPosto;
use App\Compartilhado\Posto;
use Database\Factories\FrentistaFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Tabela "Frentista" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property string $nome
 * @property ?string $cpf
 * @property ?string $telefone
 * @property Carbon $data_admissao
 * @property bool $ativo
 * @property ?int $turno_id
 * @property ?string $user_id
 * @property ?string $foto
 * @property int|null $posto_id
 */
final class Frentista extends Model
{
    /** @use HasFactory<FrentistaFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'Frentista';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['nome', 'cpf', 'telefone', 'data_admissao', 'ativo', 'turno_id', 'user_id', 'foto', 'posto_id'];

    /** @var list<string> */
    protected $hidden = ['foto'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'data_admissao' => 'datetime',
            'ativo' => 'boolean',
        ];
    }

    /** @return BelongsTo<Turno, $this> */
    public function turno(): BelongsTo
    {
        return $this->belongsTo(Turno::class);
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }

    protected static function newFactory(): FrentistaFactory
    {
        return FrentistaFactory::new();
    }
}
