<?php

declare(strict_types=1);

namespace App\Pessoas\Http\Requests;

use App\Compartilhado\Posto;
use App\Pessoas\Application\DefinePinDoFrentista;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Corpo do `POST /api/postos/{posto}/frentistas/primeiro-acesso` (#101, 27/09/2026):
 * `{ frentista_id, pin, pin_confirmacao }`. PIN como TEXTO de 4 a 6 dígitos, e a confirmação igual —
 * forma errada ou confirmação diferente é 422, sem dizer nada sobre a conta.
 */
final class PrimeiroAcessoRequest extends FormRequest
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'frentista_id' => ['required', 'integer:strict', 'min:1'],
            'pin' => ['required', 'string', 'regex:'.DefinePinDoFrentista::FORMATO],
            'pin_confirmacao' => ['required', 'string', 'same:pin'],
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
