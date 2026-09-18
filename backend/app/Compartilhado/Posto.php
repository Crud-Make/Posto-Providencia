<?php

declare(strict_types=1);

namespace App\Compartilhado;

use Database\Factories\PostoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
 * Raiz do tenant: mora em Compartilhado porque Cadastro e Pessoas apontam para ele e nenhum
 * módulo pode depender do Domain do outro. Não tem relação de saída de propósito (Compartilhado
 * não conhece módulo — Deptrac CA-1 e Pest Arch). Os filhos chegam pelo escopo
 * {@see PertenceAoPosto}: Tanque::query() sob o posto atual, nunca $posto->tanques.
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

    protected static function newFactory(): PostoFactory
    {
        return PostoFactory::new();
    }
}
