<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Requests;

use App\Fechamento\Application\DiaDeclarado;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use UnexpectedValueException;

/**
 * `PUT /api/postos/{posto}/fechamento?data=AAAA-MM-DD` — a FORMA do corpo (#103 P11, Design Doc §5.2).
 *
 * Só forma: dinheiro é string decimal com duas casas (`'123.45'`), litros com três (`'1234.567'`),
 * ids são inteiros de verdade (`integer:strict` — `"5"` não passa). Número JSON em campo de dinheiro
 * é 422: float no PHP perderia casa. String BR (`'1.718,35'`) é 422: a conversão é do cliente,
 * uma vez, e nunca se replica o parser ambíguo em PHP (memória `salvar-o-dia-apaga-leitura-base`).
 * Listas podem vir vazias, mas têm de vir (`present`). O par `total_vendas`/`diferenca` é cobrado
 * aqui na forma (`required_with` cruzado) e no valor pelo VO `TotaisDeclarados`.
 *
 * A recusa de forma sai como `{ erro: { codigo: 'corpo_invalido', mensagem, campos } }`, o mesmo
 * envelope das recusas de domínio, para o cliente ter UM formato de erro.
 *
 * A autorização é dos middlewares `token.atual` e `posto.acesso:gerir`, não daqui.
 *
 * @phpstan-import-type LeituraDeclarada from DiaDeclarado
 * @phpstan-import-type SessaoDeclarada from DiaDeclarado
 * @phpstan-import-type RecebimentoDeclarado from DiaDeclarado
 */
final class GravaFechamentoDoDiaRequest extends FormRequest
{
    private const string DINHEIRO = 'regex:/^-?\d+\.\d{2}$/';

    private const string LITROS = 'regex:/^-?\d+\.\d{3}$/';

    /** Os 7 baldes (I2) mais encerrante, conferido e diferença — todos dinheiro. */
    private const array BALDES = [
        'valor_cartao', 'valor_cartao_debito', 'valor_cartao_credito', 'valor_dinheiro', 'valor_moedas',
        'valor_pix', 'valor_nota', 'baratao', 'encerrante', 'valor_conferido', 'diferenca_calculada',
    ];

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        $regras = [
            'data' => ['required', 'date_format:Y-m-d'],
            'leituras' => ['present', 'array'],
            'leituras.*.bico_id' => ['required', 'integer:strict'],
            'leituras.*.combustivel_id' => ['required', 'integer:strict'],
            'leituras.*.leitura_inicial' => ['required', 'string', self::LITROS],
            'leituras.*.leitura_final' => ['required', 'string', self::LITROS],
            'leituras.*.litros_vendidos' => ['required', 'string', self::LITROS],
            'leituras.*.preco_litro' => ['required', 'string', self::DINHEIRO],
            'leituras.*.valor_total' => ['required', 'string', self::DINHEIRO],
            'sessoes' => ['present', 'array'],
            'sessoes.*.frentista_id' => ['required', 'integer:strict'],
            'sessoes.*.observacoes' => ['present', 'nullable', 'string'],
            'frentistas_conhecidos' => ['present', 'array'],
            'frentistas_conhecidos.*' => ['integer:strict'],
            'recebimentos' => ['present', 'array'],
            'recebimentos.*.forma_pagamento_id' => ['required', 'integer:strict'],
            'recebimentos.*.valor' => ['required', 'string', self::DINHEIRO],
            'totais' => ['required', 'array'],
            'totais.total_vendas' => ['present', 'nullable', 'string', self::DINHEIRO, 'required_with:totais.diferenca'],
            'totais.total_recebido' => ['required', 'string', self::DINHEIRO],
            'totais.diferenca' => ['present', 'nullable', 'string', self::DINHEIRO, 'required_with:totais.total_vendas'],
            'observacoes' => ['present', 'nullable', 'string'],
        ];

        foreach (self::BALDES as $balde) {
            $regras["sessoes.*.{$balde}"] = ['required', 'string', self::DINHEIRO];
        }

        return $regras;
    }

    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'erro' => [
                'codigo' => 'corpo_invalido',
                'mensagem' => 'Corpo fora do contrato do PUT /fechamento.',
                'campos' => $validator->errors()->toArray(),
            ],
        ], 422));
    }

    /** O dia pedido, em UTC — a mesma regra de {@see DiaRequest::dia()}. */
    public function dia(): CarbonImmutable
    {
        return new CarbonImmutable(self::texto($this->validated('data')).' 00:00:00', 'UTC');
    }

    /**
     * Quem está gravando — posto na requisição pelo `AutenticaPeloTokenAtual`. Lê pela interface do
     * Model, e não por `Pessoas\Domain\Usuario`: módulo não importa Domain de outro (CA-7).
     */
    public function usuarioId(): int
    {
        $usuario = $this->attributes->get('usuario');
        $id = $usuario instanceof Model ? $usuario->getKey() : null;

        if (! is_int($id)) {
            abort(500, 'Guard fora de ordem: sem usuário.');
        }

        return $id;
    }

    /** O corpo já com forma conferida, como o Command o recebe. O controller nunca vê array cru. */
    public function diaDeclarado(): DiaDeclarado
    {
        return new DiaDeclarado(
            $this->dia(),
            $this->leituras(),
            $this->sessoes(),
            $this->frentistasConhecidos(),
            $this->recebimentos(),
            self::decimalOuNulo($this->validated('totais.total_vendas')),
            self::decimal($this->validated('totais.total_recebido')),
            self::decimalOuNulo($this->validated('totais.diferenca')),
            self::textoOuNulo($this->validated('observacoes')),
        );
    }

    /** @return list<LeituraDeclarada> */
    private function leituras(): array
    {
        $lista = [];

        foreach (self::linhas($this->validated('leituras')) as $linha) {
            $lista[] = [
                'bico_id' => self::inteiro($linha['bico_id'] ?? null),
                'combustivel_id' => self::inteiro($linha['combustivel_id'] ?? null),
                'leitura_inicial' => self::decimal($linha['leitura_inicial'] ?? null),
                'leitura_final' => self::decimal($linha['leitura_final'] ?? null),
                'litros_vendidos' => self::decimal($linha['litros_vendidos'] ?? null),
                'preco_litro' => self::decimal($linha['preco_litro'] ?? null),
                'valor_total' => self::decimal($linha['valor_total'] ?? null),
            ];
        }

        return $lista;
    }

    /** @return list<SessaoDeclarada> */
    private function sessoes(): array
    {
        $lista = [];

        foreach (self::linhas($this->validated('sessoes')) as $linha) {
            $lista[] = [
                'frentista_id' => self::inteiro($linha['frentista_id'] ?? null),
                'valor_cartao' => self::decimal($linha['valor_cartao'] ?? null),
                'valor_cartao_debito' => self::decimal($linha['valor_cartao_debito'] ?? null),
                'valor_cartao_credito' => self::decimal($linha['valor_cartao_credito'] ?? null),
                'valor_dinheiro' => self::decimal($linha['valor_dinheiro'] ?? null),
                'valor_moedas' => self::decimal($linha['valor_moedas'] ?? null),
                'valor_pix' => self::decimal($linha['valor_pix'] ?? null),
                'valor_nota' => self::decimal($linha['valor_nota'] ?? null),
                'baratao' => self::decimal($linha['baratao'] ?? null),
                'encerrante' => self::decimal($linha['encerrante'] ?? null),
                'valor_conferido' => self::decimal($linha['valor_conferido'] ?? null),
                'diferenca_calculada' => self::decimal($linha['diferenca_calculada'] ?? null),
                // O painel grava `fs.observacoes || ''`; o TrimStrings/ConvertEmptyStringsToNull
                // do framework transforma '' em null no caminho, e aqui volta a ''.
                'observacoes' => self::textoOuNulo($linha['observacoes'] ?? null) ?? '',
            ];
        }

        return $lista;
    }

    /** @return list<int> */
    private function frentistasConhecidos(): array
    {
        $lista = [];

        foreach (self::valores($this->validated('frentistas_conhecidos')) as $valor) {
            $lista[] = self::inteiro($valor);
        }

        return $lista;
    }

    /** @return list<RecebimentoDeclarado> */
    private function recebimentos(): array
    {
        $lista = [];

        foreach (self::linhas($this->validated('recebimentos')) as $linha) {
            $lista[] = [
                'forma_pagamento_id' => self::inteiro($linha['forma_pagamento_id'] ?? null),
                'valor' => self::decimal($linha['valor'] ?? null),
            ];
        }

        return $lista;
    }

    /*
    | Estreitadores. As regras acima GARANTEM cada forma; o `throw` é para o impossível (validação
    | contornada), não para entrada do usuário — essa já virou 422 em failedValidation().
    */

    /** @return list<array<mixed>> */
    private static function linhas(mixed $valor): array
    {
        return is_array($valor) ? array_values(array_filter($valor, is_array(...))) : [];
    }

    /** @return list<mixed> */
    private static function valores(mixed $valor): array
    {
        return is_array($valor) ? array_values($valor) : [];
    }

    private static function inteiro(mixed $valor): int
    {
        return is_int($valor) ? $valor : throw new UnexpectedValueException('Validação deixou passar um não inteiro.');
    }

    /** @return numeric-string */
    private static function decimal(mixed $valor): string
    {
        return is_string($valor) && is_numeric($valor)
            ? $valor
            : throw new UnexpectedValueException('Validação deixou passar um não decimal.');
    }

    /** @return ?numeric-string */
    private static function decimalOuNulo(mixed $valor): ?string
    {
        return $valor === null ? null : self::decimal($valor);
    }

    private static function texto(mixed $valor): string
    {
        return is_string($valor) ? $valor : throw new UnexpectedValueException('Validação deixou passar um não texto.');
    }

    private static function textoOuNulo(mixed $valor): ?string
    {
        return $valor === null ? null : self::texto($valor);
    }
}
