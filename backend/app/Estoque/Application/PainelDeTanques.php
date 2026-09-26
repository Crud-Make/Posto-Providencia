<?php

declare(strict_types=1);

namespace App\Estoque\Application;

/**
 * Tudo o que a tela "Tanques (Combustível)" do painel lê, numa resposta (painel-pela-api.md §11):
 * os tanques ativos com o combustível, as réguas medidas, o movimento em litros desde a régua mais
 * antiga que ainda vale, as despesas do mês e o histórico do gráfico.
 *
 * Nenhuma conta: o estoque derivado, o rateio da despesa e o lucro previsto são calculados no
 * cliente, pelas MESMAS funções do caminho do Supabase (`estoqueAtualDerivado`,
 * `despesaOperacionalPorLitro`, `lucroPrevistoEstoque`).
 */
final readonly class PainelDeTanques
{
    public function __construct(
        private TanquesDoPainel $tanques,
        private MovimentoDosTanques $movimento,
    ) {}

    /** @return array<string, mixed> */
    public function __invoke(MesDoPainel $mes, string $historicoDesde): array
    {
        $reguas = $this->tanques->reguas();
        $desde = MovimentoDosTanques::desde($reguas, $mes->inicio);

        return [
            'mes' => ['inicio' => $mes->inicio, 'fim' => $mes->fim],
            'movimento_desde' => $desde,
            'tanques' => $this->tanques->tanques(),
            'reguas' => $reguas,
            'compras' => $this->movimento->compras($desde),
            'vendas' => $this->movimento->vendas($desde),
            'despesas' => $this->movimento->despesas($mes),
            'historico' => $this->tanques->historico($historicoDesde),
        ];
    }
}
