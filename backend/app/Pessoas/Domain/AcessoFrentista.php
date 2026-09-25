<?php

declare(strict_types=1);

namespace App\Pessoas\Domain;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * Tabela "AcessoFrentista" (banco/init/04-acesso-do-frentista.sql) — o PIN do frentista (#101).
 *
 * É o DONO do token de frentista no Sanctum (`tokenable_type` = esta classe, `tokenable_id` =
 * `frentista_id`). O frentista em si é de Cadastro; aqui só mora a credencial, e o que se precisa
 * do cadastro (posto, ativo, nome) é lido por query builder — módulo não importa Domain de outro
 * (CA-7). `pin_hash` tem o cast `hashed`: atribuir o PIN em claro grava o bcrypt.
 *
 * @property int $frentista_id
 * @property string $pin_hash
 * @property Carbon $createdAt
 * @property Carbon $updatedAt
 */
final class AcessoFrentista extends Model
{
    use HasApiTokens;

    /** A ability que todo token de frentista carrega; o middleware exige, o do gerente nunca tem. */
    public const string ABILITY = 'frentista';

    protected $table = 'AcessoFrentista';

    protected $primaryKey = 'frentista_id';

    public $incrementing = false;

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    /** @var list<string> */
    protected $fillable = ['frentista_id', 'pin_hash'];

    /** @var list<string> */
    protected $hidden = ['pin_hash'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['pin_hash' => 'hashed'];
    }
}
