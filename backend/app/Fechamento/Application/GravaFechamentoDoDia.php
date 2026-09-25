<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Compartilhado\Enums\StatusFechamento;
use App\Compartilhado\Eventos\LeiturasDoDiaGravadas;
use App\Compartilhado\PostoAtual;
use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\JanelaDeEscrita;
use App\Fechamento\Domain\RecusaDaGravacao;
use App\Fechamento\Domain\TotaisDeclarados;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Grava o fechamento de um dia — o `handleSave` do painel, no servidor, numa transação só (#103 P10).
 *
 * Reproduz a sequência de `useSubmissaoFechamento.ts:85-249` (Design Doc §4) com as decisões do
 * dono de 20/09/2026 (§7) por cima:
 *
 * 1. janela de escrita ({@see JanelaDeEscrita}) e coerência dos totais ({@see TotaisDeclarados})
 *    — a recusa volta como VALOR, nada é gravado;
 * 2. obtém o `Fechamento` do dia (a mesma Query da leitura, {@see FechamentoDoDia}) ou cria um
 *    RASCUNHO com `turno_id = 1` (I7: é o tampão do `UNIQUE (data, turno_id)`; `NULL` deixaria o
 *    dia aceitar vários) e `usuario_id` do usuário AUTENTICADO (I6, decisão de 21/09);
 * 3. os filhos, por {@see GravaFilhosDoDia}: `Leitura` em UPSERT por `(bico_id, data)` sem apagar
 *    o dia (a leitura-base sobrevive; muda a I5 de propósito), `FechamentoFrentista` em UPSERT +
 *    DELETE só do conjunto declarado (§7 (c), o envio tardio sobrevive), `Recebimento` em
 *    DELETE + INSERT;
 * 4. `Fechamento`: FECHADO + totais como declarados — `null` continua `null` (I8);
 * 5. depois do commit, {@see LeiturasDoDiaGravadas} com os litros por combustível: quem desconta
 *    o estoque é `App\Estoque`, que este módulo não conhece (§7 (b), CA-7). Regravar o dia emite o
 *    evento de novo e desconta de novo — DEFEITO ACEITO pelo dono (`DescontaLitrosVendidosTest`).
 *
 * **Não recalcula** `valor_conferido`, `total_vendas`, `total_recebido` nem `valor_cartao`: os
 * números vêm do cliente pelos canônicos de `@posto/utils`. Só `diferenca = total_vendas −
 * total_recebido` é revalidada, exata em centavos (§5.2).
 *
 * @phpstan-import-type LeituraDeclarada from DiaDeclarado
 */
final readonly class GravaFechamentoDoDia
{
    /** I7 — ver `useSubmissaoFechamento.ts:16-29`: não é turno de trabalho, é o tampão do unique. */
    private const int TURNO_TAMPAO = 1;

    public function __construct(
        private PostoAtual $postoAtual,
        private FechamentoDoDia $fechamentoDoDia,
        private GravaFilhosDoDia $gravaFilhos,
    ) {}

    public function __invoke(DiaDeclarado $dia, int $usuarioId): Fechamento|RecusaDaGravacao
    {
        if (! JanelaDeEscrita::aceita($dia->dia)) {
            return JanelaDeEscrita::recusa($dia->dia);
        }

        $totais = TotaisDeclarados::de($dia->totalVendas, $dia->totalRecebido, $dia->diferenca);

        if ($totais instanceof RecusaDaGravacao) {
            return $totais;
        }

        $postoId = $this->postoId();

        $fechamento = DB::transaction(function () use ($dia, $totais, $usuarioId, $postoId): Fechamento {
            $pai = $this->obtemOuCriaFechamento($dia, $usuarioId);
            ($this->gravaFilhos)($pai, $dia, $usuarioId, $postoId);

            return $this->fechaODia($pai, $totais, $dia->observacoes);
        });

        // Fora da transação: em produção isto é "depois do commit". O ouvinte é
        // ShouldHandleEventsAfterCommit de todo modo — o desconto é consequência de um dia JÁ
        // gravado, nunca condição para gravá-lo. Sem leitura declarada não há fato a anunciar.
        if ($dia->leituras !== []) {
            event(new LeiturasDoDiaGravadas(
                $postoId,
                $dia->dia->utc()->format('Y-m-d'),
                $this->litrosPorCombustivel($dia->leituras),
            ));
        }

        return $fechamento->refresh();
    }

    private function postoId(): int
    {
        // Não é recusa de domínio: é rota montada sem DefinePostoAtual. Erro de configuração
        // lança, como o middleware faz com guard fora de ordem.
        return $this->postoAtual->id()
            ?? throw new RuntimeException('GravaFechamentoDoDia exige PostoAtual definido.');
    }

    private function obtemOuCriaFechamento(DiaDeclarado $dia, int $usuarioId): Fechamento
    {
        $existente = ($this->fechamentoDoDia)($dia->dia);

        if ($existente !== null) {
            return $existente;
        }

        // A conexão está fixada em UTC (config/database.php); o cast `datetime` grava o instante
        // 00:00Z do dia, o mesmo que as Queries de P5–P7 leem. `posto_id` vem do PertenceAoPosto.
        return Fechamento::query()->create([
            'data' => $dia->dia->utc()->startOfDay(),
            'total_recebido' => '0.00',
            'status' => StatusFechamento::Rascunho,
            'usuario_id' => $usuarioId,
            'turno_id' => self::TURNO_TAMPAO,
        ]);
    }

    private function fechaODia(Fechamento $pai, TotaisDeclarados $totais, ?string $observacoes): Fechamento
    {
        $pai->fill([
            'status' => StatusFechamento::Fechado,
            'total_vendas' => $totais->totalVendas,
            'total_recebido' => $totais->totalRecebido,
            'diferenca' => $totais->diferenca,
            'observacoes' => $observacoes,
        ])->save();

        return $pai;
    }

    /**
     * Litros por combustível, somados em bcmath (escala 3) — o evento carrega string, não float.
     *
     * @param  list<LeituraDeclarada>  $leituras
     * @return array<int, numeric-string>
     */
    private function litrosPorCombustivel(array $leituras): array
    {
        $soma = [];

        foreach ($leituras as $leitura) {
            $combustivel = $leitura['combustivel_id'];
            $soma[$combustivel] = bcadd($soma[$combustivel] ?? '0.000', $leitura['litros_vendidos'], 3);
        }

        return $soma;
    }
}
