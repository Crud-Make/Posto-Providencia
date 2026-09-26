<?php

declare(strict_types=1);

namespace App\Fechamento\Domain;

/**
 * Os totais do `Fechamento` do dia refeitos a partir das partes — PORTE FIEL de
 * `consolidarFechamento` (`frontend/packages/api-core/src/encerrante.ts`), que o PWA do frentista
 * roda no cliente depois de cada envio. Quando o envio passa pela API (#101), é o servidor que
 * reconsolida, e tem de dar o MESMO número.
 *
 * **Nenhuma regra nova.** A conta é a de `totaisDoDia` + `conferido` + `meiosFromFechamentoRow` de
 * `@posto/utils/fechamento`, em bcmath com duas casas em vez de float + `emCentavos`:
 *
 * - conferido de uma sessão = dinheiro + moedas + pix + (cartão legado + débito + crédito) + nota
 *   + baratão (os 7 baldes; `null` conta como 0);
 * - `total_recebido` = soma dos conferidos;
 * - `total_vendas` = soma de `Leitura.valor_total` do dia;
 * - `diferenca` = `total_vendas − total_recebido` (positivo = FALTA);
 * - **ausência de leitura não é venda zero**: sem nenhuma leitura, ou com menos leituras que bicos
 *   ativos, o dia NÃO está apurado e venda e diferença ficam `null` (a regra de 04/09/2026).
 *
 * Todas as entradas são `numeric(15,2)` no banco, então a soma exata em centavos do bcmath é o mesmo
 * número que o `emCentavos` a cada passo do TypeScript produz. O teste de caracterização
 * (`tests/Unit/Fechamento/ConsolidacaoDoDiaTest.php`) tem os valores esperados tirados da função
 * TypeScript, rodada sobre as mesmas entradas.
 */
final readonly class ConsolidacaoDoDia
{
    /** Colunas de `FechamentoFrentista` que entram no conferido (os 7 baldes, cartão em três). */
    public const array BALDES = [
        'valor_dinheiro', 'valor_moedas', 'valor_pix', 'valor_cartao', 'valor_cartao_debito',
        'valor_cartao_credito', 'valor_nota', 'baratao',
    ];

    /**
     * @param  ?numeric-string  $totalVendas
     * @param  numeric-string  $totalRecebido
     * @param  ?numeric-string  $diferenca
     */
    private function __construct(
        public bool $apurado,
        public ?string $totalVendas,
        public string $totalRecebido,
        public ?string $diferenca,
    ) {}

    /**
     * @param  array<int, array<string, mixed>>  $sessoes  linhas de `FechamentoFrentista` do pai, com as {@see self::BALDES}
     * @param  array<int, mixed>  $valoresDasLeituras  `Leitura.valor_total` de cada leitura do dia
     * @param  int  $bicosAtivos  bicos ativos do posto — o que "encerrante completo" significa hoje
     */
    public static function de(array $sessoes, array $valoresDasLeituras, int $bicosAtivos): self
    {
        $totalRecebido = '0.00';
        foreach ($sessoes as $sessao) {
            $totalRecebido = bcadd($totalRecebido, self::conferido($sessao), 2);
        }

        $lidos = count($valoresDasLeituras);
        if ($lidos === 0 || $lidos < $bicosAtivos) {
            return new self(false, null, $totalRecebido, null);
        }

        $totalVendas = '0.00';
        foreach ($valoresDasLeituras as $valor) {
            $totalVendas = bcadd($totalVendas, self::dinheiro($valor), 2);
        }

        return new self(true, $totalVendas, $totalRecebido, bcsub($totalVendas, $totalRecebido, 2));
    }

    /**
     * @param  array<string, mixed>  $sessao
     * @return numeric-string
     */
    private static function conferido(array $sessao): string
    {
        $soma = '0.00';
        foreach (self::BALDES as $balde) {
            $soma = bcadd($soma, self::dinheiro($sessao[$balde] ?? null), 2);
        }

        return $soma;
    }

    /**
     * `null` (ou o que não é número) conta como zero — o `num()` de `meiosFromFechamentoRow`.
     *
     * @return numeric-string
     */
    private static function dinheiro(mixed $valor): string
    {
        return is_string($valor) && is_numeric($valor) ? $valor : '0.00';
    }
}
