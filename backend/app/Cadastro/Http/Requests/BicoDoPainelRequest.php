<?php

declare(strict_types=1);

namespace App\Cadastro\Http\Requests;

use App\Cadastro\Application\BicoDeclarado;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /api/postos/{posto}/bicos` e `PUT /api/postos/{posto}/bicos/{bico}` (#153):
 *
 *     { numero: int ≥ 1, bomba_id: int, combustivel_id: int, tanque_id: int, ativo: boolean }
 *
 * Aqui só a FORMA; se bomba, combustível e tanque são do posto da rota e casam entre si é regra de
 * `BicosDoPosto` (recusa com código). `posto_id` no corpo é ignorado. O tanque é obrigatório: bico
 * sem tanque não desconta estoque de lugar nenhum.
 */
final class BicoDoPainelRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'numero' => ['required', 'integer', 'min:1', 'max:999'],
            'bomba_id' => ['required', 'integer', 'min:1'],
            'combustivel_id' => ['required', 'integer', 'min:1'],
            'tanque_id' => ['required', 'integer', 'min:1'],
            'ativo' => ['required', 'boolean:strict'],
        ];
    }

    public function bico(): BicoDeclarado
    {
        return new BicoDeclarado(
            $this->integer('numero'),
            $this->integer('bomba_id'),
            $this->integer('combustivel_id'),
            $this->integer('tanque_id'),
            $this->boolean('ativo'),
        );
    }

    /** O `{bico}` da rota (a rota o restringe a dígitos). */
    public function bicoId(): int
    {
        $id = $this->route('bico');

        return is_numeric($id) ? (int) $id : 0;
    }
}
