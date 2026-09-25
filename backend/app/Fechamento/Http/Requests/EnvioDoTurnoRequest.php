<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Requests;

use App\Fechamento\Application\EnvioDeclarado;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use UnexpectedValueException;

/**
 * `POST /api/postos/{posto}/envios` — a FORMA do fechamento de turno do frentista (#101).
 *
 * O corpo é o payload que o PWA grava hoje, sem `fechamento_id`, `frentista_id` e `posto_id` (o
 * servidor decide os três), mais `data` (o dia do fechamento, `AAAA-MM-DD`) e `chave` (UUID da
 * tentativa, para a idempotência). Dinheiro em string decimal com duas casas, como no PUT do painel:
 * número JSON é 422, porque float no PHP perderia casa. Campo a mais (ex.: `frentista_id` no corpo)
 * é ignorado — o frentista é o do token.
 *
 * A recusa de forma sai no mesmo envelope das recusas de domínio: `{ erro: { codigo:
 * 'corpo_invalido', mensagem, campos } }`.
 */
final class EnvioDoTurnoRequest extends FormRequest
{
    private const string DINHEIRO = 'regex:/^-?\d{1,13}\.\d{2}$/';

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        $regras = [
            'data' => ['required', 'date_format:Y-m-d'],
            'chave' => ['required', 'uuid'],
            'observacoes' => ['present', 'nullable', 'string', 'max:500'],
        ];

        foreach (EnvioDeclarado::DINHEIRO as $coluna) {
            $regras[$coluna] = ['required', 'string', self::DINHEIRO];
        }

        return $regras;
    }

    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'erro' => [
                'codigo' => 'corpo_invalido',
                'mensagem' => 'Corpo fora do contrato do POST /envios.',
                'campos' => $validator->errors()->toArray(),
            ],
        ], 422));
    }

    /** O frentista do TOKEN, posto nos atributos pelo middleware `frentista.do.posto`. */
    public function frentistaId(): int
    {
        $id = $this->attributes->get('frentista_id');

        return is_int($id) ? $id : abort(500, 'Guard fora de ordem: sem frentista.');
    }

    public function envio(): EnvioDeclarado
    {
        $valores = [];
        foreach (EnvioDeclarado::DINHEIRO as $coluna) {
            $valores[$coluna] = self::decimal($this->validated($coluna));
        }

        $observacoes = $this->validated('observacoes');

        return new EnvioDeclarado(
            new CarbonImmutable($this->string('data')->toString().' 00:00:00', 'UTC'),
            strtolower($this->string('chave')->toString()),
            $valores,
            is_string($observacoes) ? $observacoes : null,
        );
    }

    /** @return numeric-string */
    private static function decimal(mixed $valor): string
    {
        return is_string($valor) && is_numeric($valor)
            ? $valor
            : throw new UnexpectedValueException('Validação deixou passar um não decimal.');
    }
}
