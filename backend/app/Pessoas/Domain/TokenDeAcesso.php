<?php

declare(strict_types=1);

namespace App\Pessoas\Domain;

use Illuminate\Support\Carbon;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * O token pessoal do Sanctum com as colunas tipadas (banco/init/03-autenticacao.sql). O pacote não
 * declara `expires_at` nem `tokenable_id` no model dele; sem isto, quem confere o vencimento
 * trabalha com `mixed`. Registrado em `AppServiceProvider` via `Sanctum::usePersonalAccessTokenModel`.
 *
 * @property int $id
 * @property string $tokenable_type
 * @property int $tokenable_id
 * @property string $name
 * @property ?Carbon $last_used_at
 * @property ?Carbon $expires_at
 */
final class TokenDeAcesso extends PersonalAccessToken
{
    protected $table = 'personal_access_tokens';
}
