<?php

declare(strict_types=1);

namespace App\Estoque\Http\Requests;

use App\Compartilhado\LeFrentistaDoToken;
use App\Estoque\Application\CarrinhoDeclarado;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/postos/{posto}/vendas` — `{ chave: uuid, itens: [{ produto_id, quantidade }] }` (#101).
 *
 * Sem preço e sem `frentista_id`: o preço é o do banco e o frentista é o do token (campo a mais é
 * ignorado). Quantidade inteira ≥ 1 — a tela soma de um em um. Um produto por item (repetido é 422):
 * a idempotência do banco é por `(chave, produto)`.
 */
final class RegistraVendaRequest extends FormRequest
{
    use LeFrentistaDoToken;
    use RecusaDeFormaNoEnvelope;

    public const int MAX_ITENS = 50;

    public const int MAX_QUANTIDADE = 9999;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'chave' => ['required', 'uuid'],
            'itens' => ['required', 'array', 'list', 'min:1', 'max:'.self::MAX_ITENS],
            'itens.*.produto_id' => ['required', 'integer', 'min:1', 'distinct'],
            'itens.*.quantidade' => ['required', 'integer', 'min:1', 'max:'.self::MAX_QUANTIDADE],
        ];
    }

    public function carrinho(): CarrinhoDeclarado
    {
        $itens = [];
        foreach ($this->array('itens') as $item) {
            $item = is_array($item) ? $item : [];
            $itens[] = ['produto_id' => self::inteiro($item['produto_id'] ?? null), 'quantidade' => self::inteiro($item['quantidade'] ?? null)];
        }

        return new CarrinhoDeclarado(strtolower($this->string('chave')->toString()), $itens === [] ? abort(422) : $itens);
    }

    private static function inteiro(mixed $valor): int
    {
        return is_int($valor) ? $valor : (int) (is_numeric($valor) ? $valor : 0);
    }
}
