<?php

declare(strict_types=1);

namespace App\Estoque\Http\Requests;

use App\Estoque\Application\ProdutoDeclarado;
use Illuminate\Foundation\Http\FormRequest;
use UnexpectedValueException;

/**
 * `POST /api/postos/{posto}/estoque/produtos` e `PUT /api/postos/{posto}/estoque/produtos/{produto}`
 * (painel-pela-api.md §12) — o formulário "Novo/Editar Produto":
 *
 *     { nome, codigo_barras, categoria, preco_custo: "12.5", preco_venda: "19.9", estoque_minimo: 5,
 *       unidade_medida, descricao }
 *     + no POST: { chave: uuid, estoque_inicial: 0 }
 *
 * São os campos que o `useGestaoEstoque` mandava ao Supabase. Preços em string decimal (número JSON é
 * 422) com as casas do float do painel (`String(numero)`, o texto que o supabase-js mandava): o
 * `numeric(10,2)` arredonda ao gravar, como antes. Até 7 dígitos inteiros, para o arredondamento
 * nunca estourar a coluna. Inteiros com a guarda da coluna `integer`. `posto_id` no corpo é ignorado.
 * Texto vazio vira `null` (middleware do Laravel) — o Supabase gravava `''`.
 */
final class ProdutoDoPainelRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    public const string DECIMAL = 'regex:/^-?\d{1,7}(\.\d{1,20})?$/';

    public const int TETO_INTEIRO = 1_000_000;

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        $inteiro = ['required', 'integer', 'between:-'.self::TETO_INTEIRO.','.self::TETO_INTEIRO];
        $regras = [
            'nome' => ['required', 'string'],
            'codigo_barras' => ['nullable', 'string'],
            'categoria' => ['required', 'string'],
            'preco_custo' => ['required', 'string', self::DECIMAL],
            'preco_venda' => ['required', 'string', self::DECIMAL],
            'estoque_minimo' => $inteiro,
            'unidade_medida' => ['required', 'string'],
            'descricao' => ['nullable', 'string'],
        ];

        return $this->isMethod('POST')
            ? [...$regras, 'chave' => ['required', 'uuid'], 'estoque_inicial' => $inteiro]
            : $regras;
    }

    public function produto(): ProdutoDeclarado
    {
        return new ProdutoDeclarado(
            $this->string('nome')->trim()->toString(),
            $this->textoOuNulo('codigo_barras'),
            $this->string('categoria')->toString(),
            $this->decimal('preco_custo'),
            $this->decimal('preco_venda'),
            $this->integer('estoque_minimo'),
            $this->string('unidade_medida')->toString(),
            $this->textoOuNulo('descricao'),
        );
    }

    public function chave(): string
    {
        return strtolower($this->string('chave')->toString());
    }

    public function estoqueInicial(): int
    {
        return $this->integer('estoque_inicial');
    }

    /** O `{produto}` da rota (a rota o restringe a dígitos). */
    public function produtoId(): int
    {
        $id = $this->route('produto');

        return is_numeric($id) ? (int) $id : 0;
    }

    private function textoOuNulo(string $campo): ?string
    {
        return $this->filled($campo) ? $this->string($campo)->toString() : null;
    }

    /** @return numeric-string */
    private function decimal(string $campo): string
    {
        $valor = $this->string($campo)->toString();

        return is_numeric($valor) ? $valor : throw new UnexpectedValueException('Validação deixou passar um não decimal.');
    }
}
