<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use App\Cadastro\Application\TanqueDeclarado;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/postos/{posto}/tanques` e `PUT /api/postos/{posto}/tanques/{tanque}` (#157):
 *
 *     { nome: string, combustivel_id: int, capacidade: "20000" (litros, string decimal > 0), ativo: boolean }
 *
 * Sem estoque: `estoque_atual` no corpo é ignorado (o tanque nasce com 0; decisão do dono, 27/09).
 * `posto_id` no corpo é ignorado.
 */
final class TanqueDoPainelRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:60'],
            'combustivel_id' => ['required', 'integer', 'min:1'],
            'capacidade' => ['required', 'string', 'regex:/^\d{1,8}(\.\d{1,2})?$/', 'not_regex:/^0+(\.0+)?$/'],
            'ativo' => ['required', 'boolean:strict'],
        ];
    }

    public function tanque(): TanqueDeclarado
    {
        return new TanqueDeclarado(
            $this->string('nome')->trim()->toString(),
            $this->integer('combustivel_id'),
            $this->string('capacidade')->toString(),
            $this->boolean('ativo'),
        );
    }

    /** O `{tanque}` da rota (a rota o restringe a dígitos). */
    public function tanqueId(): int
    {
        $id = $this->route('tanque');

        return is_numeric($id) ? (int) $id : 0;
    }
}
