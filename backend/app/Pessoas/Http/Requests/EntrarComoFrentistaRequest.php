<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Requests;

use App\Compartilhado\Posto;
use App\Pessoas\Application\DefinePinDoFrentista;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Corpo do `POST /api/postos/{posto}/frentistas/entrar` (#101): `{ frentista_id, pin }`.
 *
 * O PIN vai como TEXTO de 4 a 6 dígitos (`'0123'` não pode virar `123`). Forma errada é 422 e
 * não diz nada sobre a conta; PIN errado é 401, decidido em `EntrarComoFrentista`.
 */
final class EntrarComoFrentistaRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'frentista_id' => ['required', 'integer:strict', 'min:1'],
            'pin' => ['required', 'string', 'regex:'.DefinePinDoFrentista::FORMATO],
        ];
    }

    public function frentistaId(): int
    {
        return $this->integer('frentista_id');
    }

    public function pin(): string
    {
        return $this->string('pin')->toString();
    }

    /** O posto da rota, resolvido pelo `DefinePostoAtual`. */
    public function postoId(): int
    {
        $posto = $this->attributes->get('posto');

        return $posto instanceof Posto ? $posto->id : abort(500, 'Guard fora de ordem: sem posto.');
    }
}
