<?php

declare(strict_types=1);

namespace App\Compras\Application;

use Illuminate\Support\Facades\DB;

/**
 * A régua do dia de UM tanque, como o "Salvar" do painel a grava (`tanqueService.saveHistory`):
 * UPSERT em `HistoricoTanque` por `(tanque_id, data)` com o `volume_livro` que a tela calculou e,
 * quando o gerente mediu, o `volume_fisico`. Sem medição, o upsert NÃO toca o `volume_fisico` que
 * já estava lá — o PostgREST só atualiza as colunas do corpo, e o painel as omitia (`undefined`).
 * A régua que o frentista gravou pelo PWA no mesmo dia sobrevive.
 *
 * `HistoricoTanque` não tem `posto_id` e é do módulo Estoque: se escreve por query builder (CA-7);
 * o tanque já foi conferido como deste posto ({@see ConfereRegistro}).
 */
final readonly class GravaReguaDoPainel
{
    public function __invoke(RegistroDeclarado $registro, ItemDoRegistro $item): void
    {
        if ($item->tanqueId === null) {
            return;
        }

        $linha = ['tanque_id' => $item->tanqueId, 'data' => $registro->diaIso(), 'volume_livro' => $item->volumeLivro];
        $atualiza = ['volume_livro'];
        if ($item->volumeFisico !== null) {
            $linha['volume_fisico'] = $item->volumeFisico;
            $atualiza[] = 'volume_fisico';
        }

        DB::table('HistoricoTanque')->upsert([$linha], ['tanque_id', 'data'], $atualiza);
    }

    /**
     * As réguas do dia dos tanques do registro, relidas do banco.
     *
     * @return list<array{tanque_id: int, data: string, volume_livro: ?string, volume_fisico: ?string}>
     */
    public static function doDia(RegistroDeclarado $registro): array
    {
        $tanques = array_map(static fn (ItemDoRegistro $item): ?int => $item->tanqueId, $registro->reguas());

        return array_values(DB::table('HistoricoTanque')
            ->whereIn('tanque_id', $tanques)
            ->where('data', $registro->diaIso())
            ->orderBy('tanque_id')
            ->get(['tanque_id', 'volume_livro', 'volume_fisico'])
            ->map(static fn (object $linha): array => [
                'tanque_id' => self::inteiro($linha->tanque_id ?? null),
                'data' => $registro->diaIso(),
                'volume_livro' => self::decimal($linha->volume_livro ?? null),
                'volume_fisico' => self::decimal($linha->volume_fisico ?? null),
            ])
            ->all());
    }

    private static function inteiro(mixed $valor): int
    {
        return is_int($valor) ? $valor : (int) (is_numeric($valor) ? $valor : 0);
    }

    private static function decimal(mixed $valor): ?string
    {
        return is_string($valor) || is_int($valor) || is_float($valor) ? (string) $valor : null;
    }
}
