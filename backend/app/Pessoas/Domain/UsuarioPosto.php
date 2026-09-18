<?php

declare(strict_types=1);

namespace App\Pessoas\Domain;

use App\Cadastro\Domain\Posto;
use App\Compartilhado\Enums\PapelNoPosto;
use Database\Factories\UsuarioPostoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Tabela "UsuarioPosto" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property int $usuario_id
 * @property int $posto_id
 * @property PapelNoPosto|null $role
 * @property ?bool $ativo
 * @property Carbon|null $created_at
 */
final class UsuarioPosto extends Model
{
    /** @use HasFactory<UsuarioPostoFactory> */
    use HasFactory;

    protected $table = 'UsuarioPosto';

    public const UPDATED_AT = null;

    /** @var list<string> */
    protected $fillable = ['usuario_id', 'posto_id', 'role', 'ativo'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'role' => PapelNoPosto::class,
            'ativo' => 'boolean',
        ];
    }

    /** @return BelongsTo<Usuario, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }

    protected static function newFactory(): UsuarioPostoFactory
    {
        return UsuarioPostoFactory::new();
    }
}
