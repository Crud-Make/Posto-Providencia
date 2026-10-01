<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Compartilhado\PostoAtual;
use App\Fechamento\Domain\JanelaDeEscrita;
use App\Fechamento\Domain\Leitura;
use App\Fechamento\Domain\RecusaDaGravacao;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Grava SÓ os encerrantes de um dia — o PWA do dono (#102), que lê o encerrante por foto e não
 * fecha o caixa. É o pedaço "leituras" do {@see GravaFechamentoDoDia}, com as mesmas travas:
 *
 * 1. janela de escrita ({@see JanelaDeEscrita}) — a recusa volta como VALOR, nada é gravado;
 * 2. todo bico e combustível do corpo é do posto da ROTA ({@see ItensDoPosto}): o UPSERT é por
 *    `(bico_id, data)` e, sem essa conferência, um id do vizinho sobrescrevia a leitura dele;
 * 3. numa transação, o UPSERT de {@see GravaLeituras} (o mesmo do `PUT /fechamento`: bico não
 *    declarado fica como está) e, SE o dia já tem `Fechamento`, a reconsolidação dele por
 *    {@see ReconsolidaFechamento} — o encerrante mudou, então `total_vendas` e `diferenca` do pai
 *    mudam junto (ou voltam a `null`, se o dia ficou incompleto). O status do pai não muda.
 *
 * **Não cria o `Fechamento`.** O dia sem pai continua sem pai: quem abre e fecha o dia é o gerente,
 * no `PUT /fechamento`. Criar um RASCUNHO aqui seria pôr no painel um dia que ninguém conferiu.
 *
 * **Não emite `LeiturasDoDiaGravadas`.** O desconto do estoque é consequência do dia FECHADO: ele
 * acontece quando o gerente grava o dia pelo `PUT /fechamento`, que emite o evento com as leituras
 * dele. Emitir aqui também descontaria o mesmo litro duas vezes — e o desconto não devolve (memória
 * `estoque-desconta-e-nao-devolve-por-evento`).
 *
 * @phpstan-import-type LeituraDeclarada from DiaDeclarado
 */
final readonly class GravaLeiturasDoEncerrante
{
    public function __construct(
        private PostoAtual $postoAtual,
        private ItensDoPosto $itensDoPosto,
        private GravaLeituras $gravaLeituras,
        private FechamentoDoDia $fechamentoDoDia,
        private ReconsolidaFechamento $reconsolida,
        private LeiturasDoDia $leiturasDoDia,
    ) {}

    /**
     * @param  list<LeituraDeclarada>  $leituras
     * @return Collection<int, Leitura>|RecusaDaGravacao as leituras do dia depois de gravar, ou a recusa
     */
    public function __invoke(CarbonImmutable $dia, array $leituras, int $usuarioId): Collection|RecusaDaGravacao
    {
        if (! JanelaDeEscrita::aceita($dia)) {
            return JanelaDeEscrita::recusa($dia);
        }

        $postoId = $this->postoAtual->exigido('GravaLeiturasDoEncerrante');

        // Só leituras: sessões, recebimentos e totais vazios — a conferência é a mesma do dia inteiro.
        $deOutroPosto = $this->itensDoPosto->confere(
            new DiaDeclarado($dia, $leituras, [], [], [], null, '0.00', null, null),
            $postoId,
        );
        if ($deOutroPosto !== null) {
            return $deOutroPosto;
        }

        DB::transaction(function () use ($dia, $leituras, $usuarioId, $postoId): void {
            ($this->gravaLeituras)($dia, $leituras, $usuarioId, $postoId);

            $pai = ($this->fechamentoDoDia)($dia);
            if ($pai !== null) {
                ($this->reconsolida)($pai);
            }
        });

        return ($this->leiturasDoDia)($dia);
    }
}
