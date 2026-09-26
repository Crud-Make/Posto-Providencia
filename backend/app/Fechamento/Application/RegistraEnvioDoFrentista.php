<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Compartilhado\PostoAtual;
use App\Fechamento\Domain\FechamentoFrentista;
use App\Fechamento\Domain\JanelaDeEscrita;
use App\Fechamento\Domain\RecusaDaGravacao;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Grava o fechamento de turno de UM frentista, enviado pelo PWA (#101, fatia 1) — o que o PWA faz
 * hoje direto no Supabase (`buscarOuCriarFechamento` → `insert FechamentoFrentista` →
 * `consolidarFechamento`), agora numa transação só no servidor:
 *
 * 1. janela de escrita ({@see JanelaDeEscrita}, a mesma do painel — hoje 31/12/2025 até amanhã);
 * 2. repetição pela chave de idempotência: a MESMA chave com o MESMO conteúdo devolve a linha que
 *    já existe (`repetido`), sem gravar de novo; a mesma chave com outro conteúdo é recusada;
 * 3. o pai do dia ({@see PaiDoDia}), travado com `FOR UPDATE` para dois envios simultâneos não
 *    se atropelarem na consolidação;
 * 4. um envio por frentista por dia — o unique `(fechamento_id, frentista_id)`, conferido ANTES de
 *    bater nele para a recusa sair legível (`ja_enviado`, 409). É a regra que o PWA já aplica na
 *    tela ("Para corrigir, fale com o gerente no painel"); reenvio que SUBSTITUI é decisão do dono
 *    ainda não tomada (Design Doc §7);
 * 5. o `FechamentoFrentista`, com os valores como vieram (o servidor não refaz a conta da sessão);
 * 6. a reconsolidação do pai ({@see ReconsolidaFechamento}).
 *
 * O frentista vem do TOKEN (middleware `frentista.do.posto`), nunca do corpo.
 */
final readonly class RegistraEnvioDoFrentista
{
    public function __construct(
        private PostoAtual $postoAtual,
        private PaiDoDia $paiDoDia,
        private ReconsolidaFechamento $reconsolida,
        private RepeticaoDoEnvio $repeticao,
    ) {}

    public function __invoke(EnvioDeclarado $envio, int $frentistaId): EnvioRegistrado|RecusaDaGravacao
    {
        if (! JanelaDeEscrita::aceita($envio->dia)) {
            return JanelaDeEscrita::recusa($envio->dia);
        }

        $postoId = $this->postoAtual->id()
            ?? throw new RuntimeException('RegistraEnvioDoFrentista exige PostoAtual definido.');

        $jaGravado = $this->repeticao->pelaChave($envio, $frentistaId, $postoId);
        if ($jaGravado !== null) {
            return $jaGravado;
        }

        return DB::transaction(fn (): EnvioRegistrado|RecusaDaGravacao => $this->grava($envio, $frentistaId, $postoId));
    }

    private function grava(EnvioDeclarado $envio, int $frentistaId, int $postoId): EnvioRegistrado|RecusaDaGravacao
    {
        $pai = ($this->paiDoDia)($envio->dia, $postoId);

        $existente = FechamentoFrentista::query()
            ->where('fechamento_id', $pai->id)
            ->where('frentista_id', $frentistaId)
            ->first();

        if ($existente !== null) {
            // Dentro da trava: o gêmeo que chegou junto e perdeu a corrida cai aqui, com a mesma chave.
            return $this->repeticao->diante($existente, $envio);
        }

        $linha = FechamentoFrentista::query()->create([
            ...$envio->valores,
            'fechamento_id' => $pai->id,
            'frentista_id' => $frentistaId,
            'posto_id' => $postoId,
            'observacoes' => $envio->observacoes,
            'chave_envio' => $envio->chave,
        ]);

        $consolidacao = ($this->reconsolida)($pai);

        return new EnvioRegistrado($linha->refresh(), false, $consolidacao);
    }
}
