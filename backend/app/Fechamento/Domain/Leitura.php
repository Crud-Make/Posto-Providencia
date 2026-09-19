<?php

declare(strict_types=1);

namespace App\Fechamento\Domain;

use App\Compartilhado\PertenceAoPosto;
use App\Compartilhado\Posto;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Tabela "Leitura" do esquema de produção (banco/init/01-esquema-base.sql) — o encerrante de um
 * bico num dia. Só leitura nesta fatia.
 *
 * Não tem FK para Fechamento (as FKs são bico, combustivel, posto, turno e usuario, :698-702): o
 * dia liga Leitura e Fechamento por (`posto_id`, dia UTC de `data`), não por coluna — por isso
 * não há relação Eloquent entre os dois. `litros_vendidos` e `valor_total` são gravados pelo
 * cliente a partir de `litrosVendidos`/`valorDaLeitura` de `@posto/utils` (invariante I12);
 * aqui só se serializam — litros em `decimal:3`, dinheiro em `decimal:2`. `bico_id`,
 * `combustivel_id`, `turno_id` e `usuario_id` ficam inteiros: são de Cadastro e Pessoas (CA-7).
 * A tabela tem `createdAt` (DEFAULT now()) e não tem `updatedAt`, então o Eloquent não carimba.
 *
 * @property int $id
 * @property Carbon $data
 * @property int $bico_id
 * @property int $combustivel_id
 * @property string $leitura_inicial
 * @property string $leitura_final
 * @property string $litros_vendidos
 * @property string $preco_litro
 * @property string $valor_total
 * @property int $usuario_id
 * @property Carbon $createdAt
 * @property ?int $turno_id
 * @property int|null $posto_id
 */
final class Leitura extends Model
{
    use PertenceAoPosto;

    protected $table = 'Leitura';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'data', 'bico_id', 'combustivel_id', 'leitura_inicial', 'leitura_final', 'litros_vendidos',
        'preco_litro', 'valor_total', 'usuario_id', 'turno_id', 'posto_id',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'data' => 'datetime',
            'leitura_inicial' => 'decimal:3',
            'leitura_final' => 'decimal:3',
            'litros_vendidos' => 'decimal:3',
            'preco_litro' => 'decimal:2',
            'valor_total' => 'decimal:2',
            'createdAt' => 'datetime',
        ];
    }

    /** @return BelongsTo<Posto, $this> */
    public function posto(): BelongsTo
    {
        return $this->belongsTo(Posto::class);
    }
}
