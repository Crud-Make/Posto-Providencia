<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Pessoas\Domain\Usuario;
use Database\Factories\PostoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Tabela "Posto" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property string $nome
 * @property ?string $cnpj
 * @property ?string $endereco
 * @property ?string $cidade
 * @property ?string $estado
 * @property ?string $telefone
 * @property ?string $email
 * @property bool $ativo
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 *
 * Raiz do cadastro: a única classe autorizada a acoplar com todos os models do posto (relações),
 * por isso a supressão do limite de acoplamento do PHPMD vale só aqui.
 *
 * @SuppressWarnings("PHPMD.CouplingBetweenObjects")
 */
final class Posto extends Model
{
    /** @use HasFactory<PostoFactory> */
    use HasFactory;

    protected $table = 'Posto';

    /** @var list<string> */
    protected $fillable = ['nome', 'cnpj', 'endereco', 'cidade', 'estado', 'telefone', 'email', 'ativo'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
        ];
    }

    /** @return HasMany<Combustivel, $this> */
    public function combustiveis(): HasMany
    {
        return $this->hasMany(Combustivel::class);
    }

    /** @return HasMany<Tanque, $this> */
    public function tanques(): HasMany
    {
        return $this->hasMany(Tanque::class);
    }

    /** @return HasMany<Bomba, $this> */
    public function bombas(): HasMany
    {
        return $this->hasMany(Bomba::class);
    }

    /** @return HasMany<Bico, $this> */
    public function bicos(): HasMany
    {
        return $this->hasMany(Bico::class);
    }

    /** @return HasMany<Turno, $this> */
    public function turnos(): HasMany
    {
        return $this->hasMany(Turno::class);
    }

    /** @return HasMany<Frentista, $this> */
    public function frentistas(): HasMany
    {
        return $this->hasMany(Frentista::class);
    }

    /** @return HasMany<FormaPagamento, $this> */
    public function formasPagamento(): HasMany
    {
        return $this->hasMany(FormaPagamento::class);
    }

    /** @return HasMany<Maquininha, $this> */
    public function maquininhas(): HasMany
    {
        return $this->hasMany(Maquininha::class);
    }

    /** @return HasMany<Fornecedor, $this> */
    public function fornecedores(): HasMany
    {
        return $this->hasMany(Fornecedor::class);
    }

    /**
     * Usuários com vínculo neste posto (tabela "UsuarioPosto", com papel e ativo no pivô).
     *
     * @return BelongsToMany<Usuario, $this>
     */
    public function usuarios(): BelongsToMany
    {
        return $this->belongsToMany(Usuario::class, 'UsuarioPosto', 'posto_id', 'usuario_id')->withPivot(['role', 'ativo']);
    }

    protected static function newFactory(): PostoFactory
    {
        return PostoFactory::new();
    }
}
