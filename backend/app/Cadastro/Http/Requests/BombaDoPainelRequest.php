<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use App\Cadastro\Application\BombaDeclarada;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/postos/{posto}/bombas` e `PUT /api/postos/{posto}/bombas/{bomba}` (#153):
 *
 *     { nome: string, localizacao?: string|null, ativo: boolean }
 *
 * `posto_id` no corpo é ignorado — o posto é o da rota. `ativo` tem de ser booleano de JSON.
 * Recusa de forma: 422 `{ erro: { codigo: 'corpo_invalido', mensagem, campos } }`.
 */
final class BombaDoPainelRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:60'],
            'localizacao' => ['nullable', 'string', 'max:120'],
            'ativo' => ['required', 'boolean:strict'],
        ];
    }

    public function bomba(): BombaDeclarada
    {
        $localizacao = $this->string('localizacao')->trim()->toString();

        return new BombaDeclarada(
            $this->string('nome')->trim()->toString(),
            $localizacao === '' ? null : $localizacao,
            $this->boolean('ativo'),
        );
    }

    /** O `{bomba}` da rota (a rota o restringe a dígitos). */
    public function bombaId(): int
    {
        $id = $this->route('bomba');

        return is_numeric($id) ? (int) $id : 0;
    }
}
