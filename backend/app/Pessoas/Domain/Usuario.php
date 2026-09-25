<?php

declare(strict_types=1);

namespace App\Pessoas\Domain;

use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use Database\Factories\UsuarioFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Autenticavel;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * Tabela "Usuario" do esquema de produção (banco/init/01-esquema-base.sql).
 *
 * Desde a #102 (24/09/2026) é quem faz login na API: `senha` guarda o hash (cast `hashed`) e o
 * Sanctum emite o token pessoal para ele. A tabela não tem `remember_token` — a API não usa sessão.
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
final class Usuario extends Autenticavel
{
    use HasApiTokens;

    /** @use HasFactory<UsuarioFactory> */
    use HasFactory;

    protected $table = 'Usuario';

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    /** @var list<string> */
    protected $fillable = ['email', 'nome', 'senha', 'role', 'ativo', 'auth_user_id'];

    /** @var list<string> */
    protected $hidden = ['senha'];

    /** Sem coluna `remember_token`: string vazia desliga o "lembrar de mim" do Authenticatable. */
    protected $rememberTokenName = '';

    public function getAuthPasswordName(): string
    {
        return 'senha';
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'role' => Role::class,
            'ativo' => 'boolean',
            'senha' => 'hashed',
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
