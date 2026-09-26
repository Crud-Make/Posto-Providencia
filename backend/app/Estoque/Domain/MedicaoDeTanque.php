<?php

declare(strict_types=1);

namespace App\Estoque\Domain;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Tabela "HistoricoTanque" (banco/init/01-esquema-base.sql:285) — a medição de régua de um tanque
 * num dia (#74). Unique `(tanque_id, data)` (:652): medir de novo no mesmo dia SUBSTITUI.
 *
 * **Não tem `posto_id`**: o posto é o do tanque. `tanque_id` fica inteiro — Tanque é de Cadastro
 * (CA-7) — e o filtro por posto é feito por quem lê e grava (`Application\ReguaDoPosto`).
 * `volume_fisico` é `numeric(10,2)` e sai como string decimal.
 *
 * @property int $id
 * @property ?int $tanque_id
 * @property Carbon $data
 * @property ?string $volume_livro
 * @property ?string $volume_fisico
 */
final class MedicaoDeTanque extends Model
{
    protected $table = 'HistoricoTanque';

    public const CREATED_AT = 'created_at';

    public const UPDATED_AT = null;

    /** @var list<string> */
    protected $fillable = ['tanque_id', 'data', 'volume_fisico'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'data' => 'date',
            'volume_livro' => 'decimal:2',
            'volume_fisico' => 'decimal:2',
        ];
    }
}
