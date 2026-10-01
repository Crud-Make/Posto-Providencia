<?php

declare(strict_types=1);

namespace App\Fechamento\Http\Requests;

use App\Fechamento\Application\DiaDeclarado;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use UnexpectedValueException;

/**
 * `PUT /api/postos/{posto}/leituras?data=AAAA-MM-DD` — a FORMA do corpo do PWA do dono (#102).
 *
 * As mesmas regras de `leituras.*` do {@see GravaFechamentoDoDiaRequest}, sem o resto do dia:
 * litros com três casas (`'1234.567'`), dinheiro com duas (`'6.00'`), ids inteiros de verdade
 * (`integer:strict`). Número JSON em campo decimal é 422 — float no PHP perderia casa. Aqui a lista
 * não pode vir vazia (`min:1`): sem leitura não há o que gravar, e um 200 vazio esconderia o engano.
 *
 * A recusa de forma sai como `{ erro: { codigo: 'corpo_invalido', mensagem, campos } }`.
 * A autorização é dos middlewares `token.atual` e `posto.acesso:gerir`, não daqui.
 *
 * @phpstan-import-type LeituraDeclarada from DiaDeclarado
 */
final class GravaLeiturasDoEncerranteRequest extends FormRequest
{
    use RecusaDeFormaNoEnvelope;

    private const string DINHEIRO = 'regex:/^-?\d+\.\d{2}$/';

    private const string LITROS = 'regex:/^-?\d+\.\d{3}$/';

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'data' => ['required', 'date_format:Y-m-d'],
            'leituras' => ['required', 'array', 'min:1'],
            'leituras.*' => ['array'],
            'leituras.*.bico_id' => ['required', 'integer:strict'],
            'leituras.*.combustivel_id' => ['required', 'integer:strict'],
            'leituras.*.leitura_inicial' => ['required', 'string', self::LITROS],
            'leituras.*.leitura_final' => ['required', 'string', self::LITROS],
            'leituras.*.litros_vendidos' => ['required', 'string', self::LITROS],
            'leituras.*.preco_litro' => ['required', 'string', self::DINHEIRO],
            'leituras.*.valor_total' => ['required', 'string', self::DINHEIRO],
        ];
    }

    /** O dia pedido, em UTC — a mesma regra de {@see DiaRequest::dia()}. */
    public function dia(): CarbonImmutable
    {
        $data = $this->validated('data');

        return new CarbonImmutable((is_string($data) ? $data : '').' 00:00:00', 'UTC');
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

    /**
     * As leituras já com forma conferida, como o Command as recebe. O controller nunca vê array cru.
     *
     * @return list<LeituraDeclarada>
     */
    public function leituras(): array
    {
        $lista = [];
        $linhas = $this->validated('leituras');

        foreach (is_array($linhas) ? $linhas : [] as $linha) {
            $linha = is_array($linha) ? $linha : [];
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

    /*
    | Estreitadores. As regras acima GARANTEM cada forma; o `throw` é para o impossível (validação
    | contornada), não para entrada do usuário — essa já virou 422 em failedValidation().
    */

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
}
