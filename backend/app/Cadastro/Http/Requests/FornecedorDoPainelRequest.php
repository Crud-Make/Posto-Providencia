<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use App\Cadastro\Application\FornecedorDeclarado;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/postos/{posto}/fornecedores` e `PUT /api/postos/{posto}/fornecedores/{fornecedor}` (#103):
 *
 *     { nome: string, cnpj: string (como digitado), contato?: string|null, ativo: boolean }
 *
 * A forma é conferida aqui; o CNPJ (DV, numérico ou alfanumérico) é conferido no cadastro, que
 * responde 422 `cnpj_invalido` com mensagem para a tela. `posto_id` no corpo é ignorado.
 */
final class FornecedorDoPainelRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:80'],
            'cnpj' => ['required', 'string', 'max:24'],
            'contato' => ['nullable', 'string', 'max:80'],
            'ativo' => ['required', 'boolean:strict'],
        ];
    }

    public function fornecedor(): FornecedorDeclarado
    {
        $contato = $this->string('contato')->trim()->toString();

        return new FornecedorDeclarado(
            $this->string('nome')->trim()->toString(),
            $this->string('cnpj')->toString(),
            $contato === '' ? null : $contato,
            $this->boolean('ativo'),
        );
    }

    /** O `{fornecedor}` da rota (a rota o restringe a dígitos). */
    public function fornecedorId(): int
    {
        return (int) $this->route('fornecedor');
    }
}
