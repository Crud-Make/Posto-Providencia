<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use App\Compartilhado\PostoAtual;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use stdClass;

/**
 * O movimento em litros que a corrente do estoque soma e subtrai (painel-pela-api.md §11): compras e
 * vendas do posto A PARTIR de um dia, e as despesas do mês do rateio. Nenhuma conta aqui — a
 * corrente (`estoqueAtualDerivado`) e o rateio (`despesaOperacionalPorLitro`) ficam no cliente.
 *
 * `Leitura.data` e `Compra.data` são `timestamptz` em 00:00 UTC; o dia é o UTC, o mesmo prefixo
 * `AAAA-MM-DD` que a tela compara (`iso.slice(0, 10)`). A venda leva o combustível DO BICO, como o
 * `bico:Bico!inner(combustivel_id)` de hoje.
 */
final readonly class MovimentoDosTanques
{
    private const string DIA_UTC = "(l.data AT TIME ZONE 'UTC')::date";

    public function __construct(private PostoAtual $postoAtual) {}

    /**
     * De que dia em diante o movimento importa: a MAIS ANTIGA entre as últimas réguas de cada
     * tanque, ou o primeiro dia do mês (a venda do mês é o divisor do rateio), o que vier antes.
     * É um recorte que só tira linha que nenhuma conta da tela lê: cada tanque soma só o que é
     * POSTERIOR à própria régua, e todas as réguas são ≥ este dia.
     *
     * @param  list<array{tanque_id: int, data: string, volume_fisico: string}>  $reguas
     */
    public static function desde(array $reguas, string $inicioDoMes): string
    {
        $ultimaPorTanque = [];
        foreach ($reguas as $regua) {
            $atual = $ultimaPorTanque[$regua['tanque_id']] ?? '';
            $ultimaPorTanque[$regua['tanque_id']] = max($atual, $regua['data']);
        }

        return min([$inicioDoMes, ...array_values($ultimaPorTanque)]);
    }

    /** @return list<array{combustivel_id: int, data: string, quantidade_litros: string}> */
    public function compras(string $desde): array
    {
        return array_values(DB::table('Compra as l')
            ->selectRaw('l.combustivel_id, '.self::DIA_UTC.'::text AS dia, l.quantidade_litros')
            ->where('l.posto_id', $this->postoId())
            ->whereRaw(self::DIA_UTC.' >= ?', [$desde])
            ->orderByRaw(self::DIA_UTC)
            ->orderBy('l.id')
            ->get()
            ->map(static fn (stdClass $linha): array => [
                'combustivel_id' => LinhaDoTanque::inteiro($linha, 'combustivel_id'),
                'data' => LinhaDoTanque::texto($linha, 'dia'),
                'quantidade_litros' => LinhaDoTanque::decimal($linha, 'quantidade_litros'),
            ])
            ->all());
    }

    /** @return list<array{combustivel_id: int, data: string, litros_vendidos: string}> */
    public function vendas(string $desde): array
    {
        return array_values(DB::table('Leitura as l')
            ->join('Bico as b', 'b.id', '=', 'l.bico_id')
            ->selectRaw('b.combustivel_id, '.self::DIA_UTC.'::text AS dia, l.litros_vendidos')
            ->where('l.posto_id', $this->postoId())
            ->whereRaw(self::DIA_UTC.' >= ?', [$desde])
            ->orderByRaw(self::DIA_UTC)
            ->orderBy('l.id')
            ->get()
            ->map(static fn (stdClass $linha): array => [
                'combustivel_id' => LinhaDoTanque::inteiro($linha, 'combustivel_id'),
                'data' => LinhaDoTanque::texto($linha, 'dia'),
                'litros_vendidos' => LinhaDoTanque::decimal($linha, 'litros_vendidos'),
            ])
            ->all());
    }

    /** @return list<array{data: string, valor: string}> as despesas de competência no mês */
    public function despesas(MesDoPainel $mes): array
    {
        return array_values(DB::table('Despesa')
            ->selectRaw('data::text AS dia, valor')
            ->where('posto_id', $this->postoId())
            ->whereBetween('data', [$mes->inicio, $mes->fim])
            ->orderBy('data')
            ->orderBy('id')
            ->get()
            ->map(static fn (stdClass $linha): array => [
                'data' => LinhaDoTanque::texto($linha, 'dia'),
                'valor' => LinhaDoTanque::decimal($linha, 'valor'),
            ])
            ->all());
    }

    private function postoId(): int
    {
        return $this->postoAtual->id() ?? throw new RuntimeException('MovimentoDosTanques exige PostoAtual definido.');
    }
}
