<?php

declare(strict_types=1);

namespace App\Estoque\Http\Requests;

use App\Estoque\Application\MovimentacaoDeclarada;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `POST /api/postos/{posto}/estoque/movimentacoes` (painel-pela-api.md §12) — a "Registrar
 * Movimentação":
 *
 *     { chave: uuid, produto_id, tipo: "entrada"|"saida"|"ajuste", quantidade: 3,
 *       valor_unitario?: "12.5", observacao?: "NF 123" }
 *
 * Quantidade inteira ≥ 1 — o `min="1"` do modal, agora também no servidor —, com a guarda da coluna
 * `integer`. `valor_unitario` em string decimal e só lido na ENTRADA (nos outros tipos o painel nunca o
 * usou); ausente ou ≤ 0 mantém o custo, como antes. `posto_id` e `data` no corpo são ignorados: o posto
 * é o da rota e a hora é a do servidor.
 */
final class MovimentacaoDoPainelRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'chave' => ['required', 'uuid'],
            'produto_id' => ['required', 'integer', 'min:1'],
            'tipo' => ['required', 'string', Rule::in(MovimentacaoDeclarada::TIPOS)],
            'quantidade' => ['required', 'integer', 'between:1,'.ProdutoDoPainelRequest::TETO_INTEIRO],
            'valor_unitario' => ['nullable', 'string', ProdutoDoPainelRequest::DECIMAL],
            'observacao' => ['nullable', 'string'],
        ];
    }

    public function movimentacao(): MovimentacaoDeclarada
    {
        $tipo = $this->string('tipo')->toString();
        $valor = $this->string('valor_unitario')->toString();

        return new MovimentacaoDeclarada(
            strtolower($this->string('chave')->toString()),
            $this->integer('produto_id'),
            $tipo,
            $this->integer('quantidade'),
            $tipo === 'entrada' && is_numeric($valor) ? $valor : null,
            $this->filled('observacao') ? $this->string('observacao')->toString() : null,
        );
    }
}
