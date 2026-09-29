<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use App\Cadastro\Application\FormaDePagamentoDeclarada;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/postos/{posto}/formas-pagamento` e `PUT /api/postos/{posto}/formas-pagamento/{forma}` (#103):
 *
 *     { nome: string, tipo: venda|dinheiro|cartao_credito|cartao_debito|pix|outros,
 *       taxa: "3.50" (%, string decimal de 0 a 100, até 2 casas), ativo: boolean }
 *
 * `venda` é o tipo de todas as formas antigas (o `tipo` não decide conta nenhuma: ver
 * `usePagamentos.ts`); os outros cinco são os do formulário. `posto_id` no corpo é ignorado.
 */
final class FormaDePagamentoDoPainelRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    public const TIPOS = ['venda', 'dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'outros'];

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:60'],
            'tipo' => ['required', 'string', 'in:'.implode(',', self::TIPOS)],
            'taxa' => ['required', 'string', 'regex:/^\d{1,3}(\.\d{1,2})?$/', 'numeric', 'max:100'],
            'ativo' => ['required', 'boolean:strict'],
        ];
    }

    public function forma(): FormaDePagamentoDeclarada
    {
        return new FormaDePagamentoDeclarada(
            $this->string('nome')->trim()->toString(),
            $this->string('tipo')->toString(),
            $this->string('taxa')->toString(),
            $this->boolean('ativo'),
        );
    }

    /** O `{forma}` da rota (a rota o restringe a dígitos). */
    public function formaId(): int
    {
        $id = $this->route('forma');

        return is_numeric($id) ? (int) $id : 0;
    }
}
