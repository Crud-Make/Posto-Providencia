<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use App\Cadastro\Application\CombustivelDeclarado;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/postos/{posto}/combustiveis` e `PUT /api/postos/{posto}/combustiveis/{combustivel}` (#157):
 *
 *     { nome: string, codigo: string (1–6 letras/dígitos), cor?: "#RRGGBB"|null,
 *       preco_venda: "6.89" (string decimal, > 0, até 2 casas), ativo: boolean }
 *
 * O preço vai em STRING decimal, nunca número de JSON: dinheiro não passa por float. O código sai
 * em maiúsculas. `preco_custo` e `posto_id` no corpo são ignorados.
 */
final class CombustivelDoPainelRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:60'],
            'codigo' => ['required', 'string', 'regex:/^\s*[A-Za-z0-9]{1,6}\s*$/'],
            'cor' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'preco_venda' => ['required', 'string', 'regex:/^\d{1,6}(\.\d{1,2})?$/', 'not_regex:/^0+(\.0+)?$/'],
            'ativo' => ['required', 'boolean:strict'],
        ];
    }

    public function combustivel(): CombustivelDeclarado
    {
        $cor = $this->string('cor')->trim()->toString();

        return new CombustivelDeclarado(
            $this->string('nome')->trim()->toString(),
            $this->string('codigo')->trim()->upper()->toString(),
            $cor === '' ? null : strtoupper($cor),
            $this->string('preco_venda')->toString(),
            $this->boolean('ativo'),
        );
    }

    /** O `{combustivel}` da rota (a rota o restringe a dígitos). */
    public function combustivelId(): int
    {
        $id = $this->route('combustivel');

        return is_numeric($id) ? (int) $id : 0;
    }
}
