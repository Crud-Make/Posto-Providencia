<?php

declare(strict_types=1);

namespace App\Agregacao\Application;

use App\Compartilhado\PostoAtual;
use Illuminate\Support\Facades\DB;
use LogicException;
use stdClass;

/**
 * A venda de cada dia de um mês — o que a aba Fechamento Mensal lia da RPC `get_fechamento_mensal`,
 * MENOS o lucro (Design Doc agregacao.md §5 e DECISÕES 1, 3 e 4).
 *
 * Só somas que o Postgres faz sobre a própria linha, como a RPC fazia: litros e `valor_total` do
 * dia (`SUM` em `numeric`, escala exata) e os litros do dia por `combustivel_id` da LEITURA (a RPC
 * juntava `Combustivel` por `l.combustivel_id`). Cada dia com leitura é uma linha, e o `status` é o
 * do `Fechamento` do dia — o mais recente, como em `FechamentoDoDia`; sem fechamento, `ABERTO`,
 * como o `COALESCE` da RPC.
 *
 * O que a RPC fazia e daqui NÃO sai: `lucro_bruto` (`preco_custo` de hoje), `custo_taxas`
 * (1,2 %/3,5 % chumbados por nome) e `lucro_liquido` (bruto − taxas, sem despesa). Os três estão
 * errados nos eixos da agregacao.md §0, e o que pô-los no lugar é decisão do dono pendente.
 *
 * `Leitura.data` e `Fechamento.data` são `timestamptz` em 00:00 UTC; o dia é tomado em UTC.
 */
final class VendaDiariaDoMes
{
    private const string DIA_UTC = "(data AT TIME ZONE 'UTC')::date";

    public function __construct(private readonly PostoAtual $postoAtual) {}

    /**
     * @return list<array{data: string, volume_total: string, faturamento_bruto: string, volumes_por_combustivel: array<int, string>, status: string}>
     */
    public function __invoke(Periodo $mes): array
    {
        $posto = $this->postoAtual->id();
        if ($posto === null) {
            throw new LogicException('VendaDiariaDoMes exige PostoAtual definido — a rota /api/postos/{posto} é quem define.');
        }

        $volumes = $this->volumesPorCombustivel($posto, $mes);
        $status = $this->statusDoDia($posto, $mes);

        $dias = [];
        foreach ($this->totaisDoDia($posto, $mes) as $linha) {
            $dia = LinhaDoBanco::texto($linha, 'dia');
            $dias[] = [
                'data' => $dia,
                'volume_total' => LinhaDoBanco::decimal($linha, 'volume_total'),
                'faturamento_bruto' => LinhaDoBanco::decimal($linha, 'faturamento_bruto'),
                'volumes_por_combustivel' => $volumes[$dia] ?? [],
                'status' => $status[$dia] ?? 'ABERTO',
            ];
        }

        return $dias;
    }

    /** @return list<stdClass> */
    private function totaisDoDia(int $posto, Periodo $mes): array
    {
        return array_values(DB::table('Leitura')
            ->selectRaw(self::DIA_UTC.'::text AS dia, SUM(litros_vendidos) AS volume_total, SUM(valor_total) AS faturamento_bruto')
            ->where('posto_id', $posto)
            ->whereRaw(self::DIA_UTC.' BETWEEN ? AND ?', [$mes->inicio, $mes->fim])
            ->groupByRaw(self::DIA_UTC)
            ->orderByRaw(self::DIA_UTC)
            ->get()
            ->all());
    }

    /** @return array<string, array<int, string>> dia → (combustivel_id → litros); a chave vira texto só no JSON */
    private function volumesPorCombustivel(int $posto, Periodo $mes): array
    {
        $linhas = DB::table('Leitura')
            ->selectRaw(self::DIA_UTC.'::text AS dia, combustivel_id, SUM(litros_vendidos) AS litros')
            ->where('posto_id', $posto)
            ->whereRaw(self::DIA_UTC.' BETWEEN ? AND ?', [$mes->inicio, $mes->fim])
            ->groupByRaw(self::DIA_UTC.', combustivel_id')
            ->orderBy('combustivel_id')
            ->get();

        $porDia = [];
        foreach ($linhas as $linha) {
            $porDia[LinhaDoBanco::texto($linha, 'dia')][LinhaDoBanco::inteiro($linha, 'combustivel_id')] = LinhaDoBanco::decimal($linha, 'litros');
        }

        return $porDia;
    }

    /** @return array<string, string> dia → status do fechamento mais recente do dia */
    private function statusDoDia(int $posto, Periodo $mes): array
    {
        $linhas = DB::table('Fechamento')
            ->selectRaw('DISTINCT ON ('.self::DIA_UTC.') '.self::DIA_UTC."::text AS dia, COALESCE(status::text, 'ABERTO') AS status")
            ->where('posto_id', $posto)
            ->whereRaw(self::DIA_UTC.' BETWEEN ? AND ?', [$mes->inicio, $mes->fim])
            ->orderByRaw(self::DIA_UTC)
            ->orderByDesc('id')
            ->get();

        $status = [];
        foreach ($linhas as $linha) {
            $status[LinhaDoBanco::texto($linha, 'dia')] = LinhaDoBanco::texto($linha, 'status');
        }

        return $status;
    }
}
