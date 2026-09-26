<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use App\Cadastro\Application\FrentistaDeclarado;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/postos/{posto}/equipe` e `PUT /api/postos/{posto}/equipe/{frentista}` (#103, tela
 * Frentistas) — o formulário "Novo/Editar Frentista":
 *
 *     { nome: string, data_admissao: "AAAA-MM-DD", ativo: boolean }
 *
 * Os três campos são os que o formulário manda hoje (`DadosFormularioFrentista`). `posto_id` no corpo
 * é ignorado — o posto é o da rota. `ativo` tem de ser booleano de JSON (`"true"` é 422). Recusa de
 * forma: 422 `{ erro: { codigo: 'corpo_invalido', mensagem, campos } }`. A admissão
 * é o DIA: grava meia-noite UTC, que é o que o PostgREST gravava de `'AAAA-MM-DD'` numa
 * `timestamptz` com a sessão em UTC.
 */
final class FrentistaDaEquipeRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string'],
            'data_admissao' => ['required', 'date_format:Y-m-d'],
            'ativo' => ['required', 'boolean:strict'],
        ];
    }

    public function frentista(): FrentistaDeclarado
    {
        return new FrentistaDeclarado(
            $this->string('nome')->trim()->toString(),
            new CarbonImmutable($this->string('data_admissao')->toString().' 00:00:00', 'UTC'),
            $this->boolean('ativo'),
        );
    }

    /** O `{frentista}` da rota (a rota o restringe a dígitos). */
    public function frentistaId(): int
    {
        $id = $this->route('frentista');

        return is_numeric($id) ? (int) $id : 0;
    }
}
