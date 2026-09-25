<?php

declare(strict_types=1);

namespace App\Compras\Http\Requests;

use App\Compras\Application\ItemDoRegistro;
use App\Compras\Application\RegistroDeclarado;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/postos/{posto}/compras` — o "Salvar" do Registro de Compras (#103):
 *
 *     { chave: uuid, data: "AAAA-MM-DD", fornecedor_id: int|null,
 *       itens: [{ combustivel_id, tanque_id: int|null,
 *                 compra: { quantidade_litros, valor_total } | null,
 *                 volume_livro: string|null, volume_fisico: string|null }] }
 *
 * Litros, dinheiro e volume em STRING decimal — número JSON é 422, como no `PUT /fechamento`.
 * `valor_total` até 2 casas (centavos); `quantidade_litros` até 3 e maior que zero (a coluna é
 * `numeric(15,2)` e o Postgres arredonda, como arredondava o float do painel). `volume_livro` é o
 * estoque escritural que a tela calcula: pode ser negativo e vem com as casas do float do painel
 * (até 20) — o `numeric(10,2)` arredonda, como arredondava o número que o PostgREST recebia; `null`
 * grava `null`, como o `NaN` que o `JSON.stringify` do painel virava. Um combustível por item
 * (repetido é 422): o unique é por `(chave, combustível)`.
 */
final class RegistraComprasRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    public const int MAX_ITENS = 30;

    private const string VOLUME = '/^-?\d{1,8}(\.\d{1,20})?$/';

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'chave' => ['required', 'uuid'],
            'data' => ['required', 'date_format:Y-m-d'],
            'fornecedor_id' => ['present', 'nullable', 'integer:strict', 'min:1'],
            'itens' => ['required', 'array', 'list', 'min:1', 'max:'.self::MAX_ITENS],
            'itens.*.combustivel_id' => ['required', 'integer:strict', 'min:1', 'distinct'],
            'itens.*.tanque_id' => ['present', 'nullable', 'integer:strict', 'min:1'],
            'itens.*.compra' => ['present', 'nullable', 'array:quantidade_litros,valor_total', 'required_array_keys:quantidade_litros,valor_total'],
            'itens.*.compra.quantidade_litros' => ['string', 'regex:/^\d{1,13}(\.\d{1,3})?$/', 'not_regex:/^0+(\.0+)?$/'],
            'itens.*.compra.valor_total' => ['string', 'regex:/^\d{1,13}(\.\d{1,2})?$/'],
            'itens.*.volume_livro' => ['present', 'nullable', 'string', 'regex:'.self::VOLUME],
            'itens.*.volume_fisico' => ['nullable', 'string', 'regex:'.self::VOLUME, 'not_regex:/^-/'],
        ];
    }

    public function registro(): RegistroDeclarado
    {
        $itens = array_map(self::item(...), array_values($this->array('itens')));
        $fornecedor = $this->input('fornecedor_id');

        return new RegistroDeclarado(
            strtolower($this->string('chave')->toString()),
            new CarbonImmutable($this->string('data')->toString().' 00:00:00', 'UTC'),
            is_int($fornecedor) ? $fornecedor : null,
            $itens === [] ? abort(422) : $itens,
        );
    }

    private static function item(mixed $item): ItemDoRegistro
    {
        $item = is_array($item) ? $item : [];
        $compra = is_array($item['compra'] ?? null) ? $item['compra'] : [];
        $tanque = $item['tanque_id'] ?? null;

        return new ItemDoRegistro(
            is_int($item['combustivel_id'] ?? null) ? $item['combustivel_id'] : 0,
            is_int($tanque) ? $tanque : null,
            self::decimal($compra['quantidade_litros'] ?? null),
            self::decimal($compra['valor_total'] ?? null),
            self::decimal($item['volume_livro'] ?? null),
            self::decimal($item['volume_fisico'] ?? null),
        );
    }

    /** @return ?numeric-string */
    private static function decimal(mixed $valor): ?string
    {
        return is_string($valor) && is_numeric($valor) ? $valor : null;
    }
}
