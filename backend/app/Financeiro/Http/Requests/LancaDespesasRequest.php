<?php

declare(strict_types=1);

namespace App\Financeiro\Http\Requests;

use App\Financeiro\Application\DespesaDeclarada;
use App\Financeiro\Application\LancamentoDeDespesas;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/postos/{posto}/despesas` (#103) — um "Lançar" da aba Receitas e Despesas:
 *
 *     { chave: uuid, despesas: [ { descricao, categoria?, categoria_id?, valor: "123.45",
 *       data: "AAAA-MM-DD", status: pendente|pago, recorrente: boolean, data_pagamento?, observacoes? } ] }
 *
 * `valor` em STRING decimal (> 0, até 2 casas): dinheiro não passa por float. `posto_id` no corpo
 * é ignorado. Até 50 despesas por lançamento.
 */
final class LancaDespesasRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'chave' => ['required', 'uuid'],
            'despesas' => ['required', 'array', 'min:1', 'max:50'],
            'despesas.*.descricao' => ['required', 'string', 'max:200'],
            'despesas.*.categoria' => ['nullable', 'string', 'max:60'],
            'despesas.*.categoria_id' => ['nullable', 'integer', 'min:1'],
            'despesas.*.valor' => ['required', 'string', 'regex:/^\d{1,13}(\.\d{1,2})?$/', 'not_regex:/^0+(\.0+)?$/'],
            'despesas.*.data' => ['required', 'date_format:Y-m-d'],
            'despesas.*.status' => ['required', 'in:pendente,pago'],
            'despesas.*.recorrente' => ['required', 'boolean:strict'],
            'despesas.*.data_pagamento' => ['nullable', 'date_format:Y-m-d'],
            'despesas.*.observacoes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function lancamento(): LancamentoDeDespesas
    {
        /** @var list<array<string, mixed>> $itens */
        $itens = array_values((array) $this->validated('despesas'));

        return new LancamentoDeDespesas(
            $this->string('chave')->toString(),
            array_map(self::despesa(...), $itens),
        );
    }

    /** @param  array<string, mixed>  $item */
    private static function despesa(array $item): DespesaDeclarada
    {
        $texto = static fn (string $campo): ?string => is_string($item[$campo] ?? null) && trim($item[$campo]) !== '' ? trim($item[$campo]) : null;

        return new DespesaDeclarada(
            $texto('descricao') ?? '',
            $texto('categoria'),
            is_int($item['categoria_id'] ?? null) ? $item['categoria_id'] : null,
            $texto('valor') ?? '0',
            $texto('data') ?? '',
            $texto('status') ?? 'pendente',
            ($item['recorrente'] ?? false) === true,
            $texto('data_pagamento'),
            $texto('observacoes'),
        );
    }
}
