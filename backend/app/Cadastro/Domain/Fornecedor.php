<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Compartilhado\PertenceAoPosto;
use Database\Factories\FornecedorFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tabela "Fornecedor" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property string $nome
 * @property string $cnpj
 * @property ?string $contato
 * @property bool $ativo
 * @property int|null $posto_id
 */
final class Fornecedor extends Model
{
    /** @use HasFactory<FornecedorFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'Fornecedor';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['nome', 'cnpj', 'contato', 'ativo', 'posto_id'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
        ];
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }

    protected static function newFactory(): FornecedorFactory
    {
        return FornecedorFactory::new();
    }
}
