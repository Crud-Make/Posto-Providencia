<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Compartilhado\PertenceAoPosto;
use App\Compartilhado\Posto;
use Database\Factories\FormaPagamentoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tabela "FormaPagamento" do esquema de produção (banco/init/01-esquema-base.sql). Só leitura na #97.
 *
 * @property int $id
 * @property string $nome
 * @property string $tipo
 * @property bool $ativo
 * @property ?string $taxa
 * @property int|null $posto_id
 */
final class FormaPagamento extends Model
{
    /** @use HasFactory<FormaPagamentoFactory> */
    use HasFactory;

    use PertenceAoPosto;

    protected $table = 'FormaPagamento';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = ['nome', 'tipo', 'ativo', 'taxa', 'posto_id'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
            'taxa' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }

    protected static function newFactory(): FormaPagamentoFactory
    {
        return FormaPagamentoFactory::new();
    }
}
