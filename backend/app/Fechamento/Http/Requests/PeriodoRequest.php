<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * `?data=AAAA-MM-DD[&ate=AAAA-MM-DD]` de `GET /sessoes` e `GET /leituras`. Sem `ate`, um dia só — o
 * contrato de sempre (a tela de Fechamento de Caixa). Com `ate`, o período inteiro: o Dashboard pede
 * as sessões do período (antes pedia só o primeiro dia e a tabela contradizia os cards), e a aba
 * Fechamento Mensal pede as leituras e as sessões do mês (#103, Fechamento de Caixa 100% pela API).
 * Teto de 62 dias: cobre dois meses cheios, que é o maior período que as telas oferecem.
 *
 * Era `SessoesRequest`; virou `PeriodoRequest` quando `GET /leituras` passou a aceitar `ate` — a
 * mesma validação, não uma cópia dela.
 */
final class PeriodoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'data' => ['required', 'date_format:Y-m-d'],
            'ate' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:data'],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->has('ate') && $validator->errors()->isEmpty() && $this->ultimoDia()->diffInDays($this->dia()->addDays(61), false) < 0) {
                    $validator->errors()->add('ate', 'O período pode ter no máximo 62 dias.');
                }
            },
        ];
    }

    public function dia(): CarbonImmutable
    {
        return new CarbonImmutable($this->string('data')->toString().' 00:00:00', 'UTC');
    }

    public function ultimoDia(): CarbonImmutable
    {
        return $this->has('ate') ? new CarbonImmutable($this->string('ate')->toString().' 00:00:00', 'UTC') : $this->dia();
    }
}
