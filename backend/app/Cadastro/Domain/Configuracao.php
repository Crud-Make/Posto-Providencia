<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

use App\Compartilhado\PertenceAoPosto;
use Illuminate\Database\Eloquent\Model;

/**
 * Tabela "Configuracao" (banco/init/01-esquema-base.sql): um parâmetro do posto por linha, `valor`
 * em texto. Única por (chave, posto_id) desde 02-multi-tenant-uniques-por-posto.sql — é o que
 * deixa gravar por UPSERT (#103, parâmetros de Configurações). Só `updated_at`, sem `created_at`.
 *
 * @property int $id
 * @property string $chave
 * @property string $valor
 * @property int|null $posto_id
 */
final class Configuracao extends Model
{
    use PertenceAoPosto;

    public const CREATED_AT = null;

    protected $table = 'Configuracao';

    /** @var list<string> */
    protected $fillable = ['chave', 'valor', 'posto_id'];
}
