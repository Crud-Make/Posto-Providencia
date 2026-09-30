<?php

declare(strict_types=1);

namespace App\Pessoas\Domain;

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Posto;
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
 * @property string|null $usuario login por nome no cartão do posto (banco/init/15-login-por-usuario.sql)
 * @property Carbon|null $created_at
 */
final class UsuarioPosto extends Model
{
    /** @use HasFactory<UsuarioPostoFactory> */
    use HasFactory;

    protected $table = 'UsuarioPosto';

    public const UPDATED_AT = null;

    /** @var list<string> */
    protected $fillable = ['usuario_id', 'posto_id', 'role', 'ativo', 'usuario'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'role' => PapelNoPosto::class,
            'ativo' => 'boolean',
        ];
    }

    /**
     * A conta dona do vínculo. Não se chama `usuario()` porque a coluna `usuario` (o login por nome)
     * venceria a relação no acesso por propriedade: `$vinculo->usuario` devolveria o texto.
     *
     * @return BelongsTo<Usuario, $this>
     */
    public function conta(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
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
