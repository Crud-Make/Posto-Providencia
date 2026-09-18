<?php

declare(strict_types=1);

namespace App\Pessoas\Domain;

use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use Database\Factories\UsuarioFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Tabela "Usuario" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property string $email
 * @property string $nome
 * @property ?string $senha
 * @property Role $role
 * @property bool $ativo
 * @property ?string $auth_user_id
 * @property Carbon $createdAt
 * @property Carbon $updatedAt
 */
final class Usuario extends Model
{
    /** @use HasFactory<UsuarioFactory> */
    use HasFactory;

    protected $table = 'Usuario';

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    /** @var list<string> */
    protected $fillable = ['email', 'nome', 'senha', 'role', 'ativo', 'auth_user_id'];

    /** @var list<string> */
    protected $hidden = ['senha'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'role' => Role::class,
            'ativo' => 'boolean',
        ];
    }

    /** @return HasMany<UsuarioPosto, $this> */
    public function vinculos(): HasMany
    {
        return $this->hasMany(UsuarioPosto::class);
    }

    /** @return BelongsToMany<Posto, $this> */
    public function postos(): BelongsToMany
    {
        return $this->belongsToMany(Posto::class, 'UsuarioPosto', 'usuario_id', 'posto_id')->withPivot(['role', 'ativo']);
    }

    protected static function newFactory(): UsuarioFactory
    {
        return UsuarioFactory::new();
    }
}
