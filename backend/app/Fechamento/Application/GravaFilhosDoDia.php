<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\FechamentoFrentista;
use App\Fechamento\Domain\Leitura;
use App\Fechamento\Domain\Recebimento;
use Illuminate\Support\Facades\DB;

/**
 * Grava o que pende de um `Fechamento`: as leituras do dia (ligadas pelo dia, não por FK), as
 * sessões dos frentistas e os recebimentos. Sempre dentro da transação de
 * {@see GravaFechamentoDoDia}, que é quem decide se o dia pode ser gravado — aqui não há regra,
 * só escrita.
 *
 * Existe separado do Command porque o PHPMD limita o acoplamento por classe (13): o Command
 * fica com janela, totais, o pai e o evento; esta fica com os três filhos.
 *
 * @phpstan-import-type RecebimentoDeclarado from DiaDeclarado
 */
final readonly class GravaFilhosDoDia
{
    /** Colunas da sessão que o UPSERT atualiza. `data_hora_envio` fica de fora de propósito. */
    private const array COLUNAS_DA_SESSAO = [
        'valor_cartao', 'valor_cartao_debito', 'valor_cartao_credito', 'valor_dinheiro', 'valor_moedas',
        'valor_pix', 'valor_nota', 'baratao', 'encerrante', 'valor_conferido', 'diferenca_calculada',
        'observacoes',
    ];

    public function __invoke(Fechamento $pai, DiaDeclarado $dia, int $usuarioId, int $postoId): void
    {
        $this->gravaLeituras($dia, $usuarioId, $postoId);
        $this->gravaSessoes($pai, $dia, $postoId);
        $this->gravaRecebimentos($pai, $dia->recebimentos);
    }

    /**
     * UPSERT por `(bico_id, data)` — unique `leitura_unica_bico_data` (`01-esquema-base.sql:777`).
     *
     * NÃO apaga o dia inteiro antes: bico não declarado fica como está. É o que mata "salvar o dia
     * apaga a leitura-base" (memória `salvar-o-dia-apaga-leitura-base`), e muda a I5 de propósito.
     */
    private function gravaLeituras(DiaDeclarado $dia, int $usuarioId, int $postoId): void
    {
        if ($dia->leituras === []) {
            return;
        }

        // Offset explícito no valor: o UPSERT passa pelo query builder, sem cast, e o instante não
        // pode depender do fuso da sessão. `turno_id` fica NULL, como o painel sempre gravou
        // (`useSubmissaoFechamento.ts:153-162` nunca o envia).
        $instante = $dia->dia->utc()->startOfDay()->format('Y-m-d H:i:sP');

        $linhas = array_map(static fn (array $leitura): array => [
            ...$leitura,
            'data' => $instante,
            'usuario_id' => $usuarioId,
            'posto_id' => $postoId,
        ], $dia->leituras);

        Leitura::query()->upsert($linhas, ['bico_id', 'data'], [
            'combustivel_id', 'leitura_inicial', 'leitura_final', 'litros_vendidos', 'preco_litro',
            'valor_total', 'usuario_id',
        ]);
    }

    /**
     * UPSERT por `(fechamento_id, frentista_id)` (unique `fechamento_frentista_unico_por_dia`,
     * `:761`) + DELETE só de `frentistas_conhecidos ∖ enviados` — §7 (c). Quem a tela nunca viu
     * (envio tardio do PWA) não é dela para apagar.
     */
    private function gravaSessoes(Fechamento $pai, DiaDeclarado $dia, int $postoId): void
    {
        $linhas = array_map(static fn (array $sessao): array => [
            ...$sessao,
            'fechamento_id' => $pai->id,
            'posto_id' => $postoId,
        ], $dia->sessoes);

        if ($linhas !== []) {
            FechamentoFrentista::query()->upsert($linhas, ['fechamento_id', 'frentista_id'], self::COLUNAS_DA_SESSAO);
        }

        $enviados = array_column($dia->sessoes, 'frentista_id');
        $removidos = array_values(array_diff($dia->frentistasConhecidos, $enviados));

        if ($removidos !== []) {
            $this->apagaSessoes($pai, $removidos);
        }
    }

    /**
     * Apaga as sessões que o gerente tirou da tela — e só elas.
     *
     * Reproduz `fechamentoFrentista.service.ts:195-240` restrito às linhas apagadas: a
     * `Notificacao` vai junto e `NotaFrentista`/`VendaProduto` ficam no histórico sem o vínculo
     * (as FKs são RESTRICT, `01-esquema-base.sql:708,734`). Tabela alheia se toca pelo query
     * builder, nunca por model de outro módulo (CA-7).
     *
     * @param  list<int>  $frentistas
     */
    private function apagaSessoes(Fechamento $pai, array $frentistas): void
    {
        $ids = FechamentoFrentista::query()
            ->where('fechamento_id', $pai->id)
            ->whereIn('frentista_id', $frentistas)
            ->pluck('id');

        if ($ids->isEmpty()) {
            return;
        }

        DB::table('Notificacao')->whereIn('fechamento_frentista_id', $ids)->delete();
        DB::table('NotaFrentista')->whereIn('fechamento_frentista_id', $ids)->update(['fechamento_frentista_id' => null]);
        DB::table('VendaProduto')->whereIn('fechamento_frentista_id', $ids)->update(['fechamento_frentista_id' => null]);

        FechamentoFrentista::query()->whereKey($ids)->delete();
    }

    /**
     * DELETE + INSERT: só o painel escreve `Recebimento`, não há unique nem envio tardio.
     *
     * @param  list<RecebimentoDeclarado>  $recebimentos
     */
    private function gravaRecebimentos(Fechamento $pai, array $recebimentos): void
    {
        Recebimento::query()->where('fechamento_id', $pai->id)->delete();

        if ($recebimentos === []) {
            return;
        }

        // 'Fechamento Geral' é o que o painel sempre gravou em `observacoes` (`:222`).
        Recebimento::query()->insert(array_map(static fn (array $recebimento): array => [
            'fechamento_id' => $pai->id,
            'forma_pagamento_id' => $recebimento['forma_pagamento_id'],
            'valor' => $recebimento['valor'],
            'observacoes' => 'Fechamento Geral',
        ], $recebimentos));
    }
}
