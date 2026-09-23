/**
 * O caminho LEGADO de gravação do dia, pelo Supabase (PostgREST) — o corpo de
 * `useSubmissaoFechamento.handleSave` como estava até a #103 P11, movido para cá.
 *
 * @remarks
 * **Não morre e não é decomposto.** A Vercel não define `VITE_API_URL`, então a produção continua
 * gravando por aqui até o cutover (#105); decompor código condenado sem mudar comportamento é
 * custo sem retorno, e os quatro `it` de `useSubmissaoFechamento.test.ts` o prendem. Quando o
 * #105 desligar este caminho, este arquivo some inteiro — junto com o override de complexidade
 * que ele carrega em `.oxlintrc.json`.
 *
 * Os defeitos conhecidos deste caminho (apagar a leitura-base, apagar envio tardio, descontar o
 * Estoque sem devolver) estão anotados inline e continuam aqui de propósito: quem os conserta é
 * o `PUT /fechamento` da API, não este arquivo. O "gravar 0 em vez de null" em `total_vendas`
 * morreu em 22/09/2026 (#103 P8) por consequência do tipo da fonte — ver o passo 5.
 *
 * Única mudança em relação ao original: três expressões booleanas ficaram explícitas (`:152`,
 * `:156`, `:157`) para o arquivo novo não nascer com dívida de `strict-boolean-expressions`.
 * `string` só é falsy quando vazia e `??` coincide com `||` para `''`, então o comportamento é
 * o mesmo.
 */
import { USUARIO_SISTEMA_ID } from '@shared/constants/usuario-sistema';
import { conferido, diferenca as calcularDiferenca } from '@posto/utils';
import {
   fechamentoService,
   leituraService,
   fechamentoFrentistaService,
   recebimentoService
} from '../../../services/api';
import { isSuccess } from '../../../types/ui/response-types';
import { meiosDaSessao, sessaoSemMovimento } from '../../../utils/fechamentoMeios';
import { parseValue } from '../../../utils/formatters';
import type { DiaNaTela } from './montarDiaDeclarado';

/**
 * Valor gravado em `Fechamento.turno_id` enquanto a coluna existir.
 *
 * @remarks [16/08] NÃO é o turno de trabalho — o posto não trabalha por turno, e o conceito
 *          saiu do sistema. É um tampão para não perder a única garantia que a coluna ainda
 *          sustenta: o índice de produção é `UNIQUE (data, turno_id)`, e em Postgres dois
 *          `NULL` não colidem entre si. Gravar `null` aqui não daria erro — apenas deixaria
 *          o mesmo dia aceitar vários `Fechamento`, cada um afirmando um `total_vendas`
 *          diferente, sem nada reclamar.
 *
 *          Sai junto com a migração que trocar o índice para `UNIQUE (data)` e dropar a
 *          coluna. Até lá, esta constante é o que mantém um fechamento por dia.
 */
const TURNO_TAMPAO_ATE_A_MIGRACAO = 1;

/** O que a gravação (legada ou pela API) recebe da tela. */
export interface ParametrosDaGravacao extends DiaNaTela {
   readonly selectedDate: string;
   /** A diferença como a tela a calcula; só o caminho legado a grava (a API recomputa a canônica). */
   readonly diferenca: number;
}

/**
 * Executa a persistência de todos os dados do fechamento pelo Supabase, em ~8 idas soltas ao
 * servidor, sem transação. Lança `Error` na primeira falha; quem chama converte em mensagem.
 */
export async function gravarPeloSupabase(params: ParametrosDaGravacao, postoAtivoId: number): Promise<void> {
   const {
      selectedDate,
      bicos,
      leituras,
      sessoesFrentistas,
      payments,
      totalVendas,
      totalFrentistas,
      diferenca,
      observacoes
   } = params;

   // 0. Limpar as leituras do dia ANTES de qualquer outra coisa.
   //
   // Roda sempre, exista ou não `Fechamento` para a data — e é justamente o caso "não
   // existe" que importa: dia histórico não tem fechamento, então antes isto era pulado,
   // o código inseria por cima das leituras já gravadas e o dia ficava com o dobro dos
   // litros (a agregação não separa por turno). Só há uma leitura por bico por dia.
   //
   // Vem antes de criar o `Fechamento` para não deixar fechamento órfão quando a exclusão
   // é recusada, e antes das outras duas exclusões porque é a única barrada pela janela de
   // 7 dias da RLS — `FechamentoFrentista` e `Recebimento` apagam sempre, e perdê-los para
   // depois descobrir que as leituras não saíram deixaria o dia pela metade.
   // Um DELETE barrado pela RLS não vira erro do Supabase: quem confere é o serviço,
   // contando o que sobrou.
   const leiturasAntigasRes = await leituraService.deleteByDate(selectedDate, postoAtivoId);
   if (!isSuccess(leiturasAntigasRes)) {
      throw new Error(leiturasAntigasRes.error || 'Erro ao limpar as leituras anteriores');
   }

   // 1. Obter ou Criar Fechamento
   const fechamentoRes = await fechamentoService.getDoDia(selectedDate, postoAtivoId);

   let fechamento;
   if (isSuccess(fechamentoRes) && fechamentoRes.data) {
      fechamento = fechamentoRes.data;

      const [frentistasRes, recebimentosRes] = await Promise.all([
         fechamentoFrentistaService.deleteByFechamento(fechamento.id),
         recebimentoService.deleteByFechamento(fechamento.id)
      ]);

      if (!isSuccess(frentistasRes)) {
         throw new Error(frentistasRes.error || 'Erro ao limpar os frentistas anteriores');
      }
      if (!isSuccess(recebimentosRes)) {
         throw new Error(recebimentosRes.error || 'Erro ao limpar os recebimentos anteriores');
      }
   } else {
      const createRes = await fechamentoService.create({
         data: selectedDate,
         usuario_id: USUARIO_SISTEMA_ID,
         turno_id: TURNO_TAMPAO_ATE_A_MIGRACAO,
         status: 'RASCUNHO',
         posto_id: postoAtivoId
      });

      if (!isSuccess(createRes)) {
         throw new Error(createRes.error || 'Erro ao criar fechamento');
      }
      fechamento = createRes.data;
   }

   // 2. Salvar Leituras
   //
   // 🔴 DEFEITO CONHECIDO (achado em 20/09/2026, não corrigido aqui): este filtro
   // deixa de fora o bico cujo campo de fechamento está VAZIO — e o passo 0 já apagou
   // TODAS as `Leitura` do dia. Bico com a primeira foto do dia lançada e ainda sem
   // fechamento mostra `fechamento: ''` (`useLeituras.ts:294-297`), string vazia é
   // falsy, e a linha **não volta**. Salvar o dia destrói em silêncio a leitura-base
   // desse bico, e o `Estoque` que ela descontou nunca é devolvido.
   // Consertado no caminho da API (UPSERT por bico, `GravaFilhosDoDia.php`), não aqui.
   // Ver a memória `salvar-o-dia-apaga-leitura-base`.
   const leiturasToCreate = bicos
      .filter(b => {
         const leitura = leituras[b.id];
         return leitura !== undefined && leitura.fechamento !== '';
      })
      .map(bico => ({
         bico_id: bico.id,
         data: selectedDate,
         leitura_inicial: parseValue(leituras[bico.id]?.inicial ?? ''),
         leitura_final: parseValue(leituras[bico.id]?.fechamento ?? ''),
         combustivel_id: bico.combustivel.id,
         preco_litro: bico.combustivel.preco_venda,
         usuario_id: USUARIO_SISTEMA_ID,
         posto_id: postoAtivoId
      }));

   if (leiturasToCreate.length > 0) {
      const leiturasRes = await leituraService.bulkCreate(leiturasToCreate);
      if (!isSuccess(leiturasRes)) {
         throw new Error(leiturasRes.error || 'Erro ao salvar leituras');
      }
   }

   // 3. Salvar Sessões de Frentistas
   if (sessoesFrentistas.length > 0) {
      const frentistasToCreate = sessoesFrentistas
         // Linha semeada sem nenhum lançamento é "não trabalhou hoje": não vira
         // registro — sessão de R$ 0,00 no banco seria indistinguível de um
         // frentista que fechou sem vender (ver sessaoSemMovimento).
         .filter(fs => fs.frentistaId !== null && !sessaoSemMovimento(fs))
         .map(fs => {
            // Aritmética canônica via @posto/utils (soma dos 7 buckets).
            const meios = meiosDaSessao(fs);
            const conf = conferido(meios);
            const encerrante = parseValue(fs.valor_encerrante);
            // diferenca = encerrante − conferido (positivo = FALTA). Só faz
            // sentido quando há encerrante lançado.
            const dif = encerrante > 0 ? calcularDiferenca(encerrante, conf) : 0;

            return {
               fechamento_id: fechamento.id,
               frentista_id: fs.frentistaId!,
               // Campos brutos preservados (não recomputa/zera o lump valor_cartao):
               valor_cartao: parseValue(fs.valor_cartao),
               valor_cartao_debito: meios.cartaoDebito,
               valor_cartao_credito: meios.cartaoCredito,
               valor_dinheiro: meios.dinheiro,
               valor_moedas: meios.moedas,
               valor_pix: meios.pix,
               valor_nota: meios.nota,
               baratao: meios.baratao,
               encerrante,
               diferenca_calculada: dif,
               valor_conferido: conf, // soma dos declarados (não mais = encerrante)
               observacoes: fs.observacoes || '',
               posto_id: postoAtivoId
            };
         });

      if (frentistasToCreate.length > 0) {
         const sessoesRes = await fechamentoFrentistaService.bulkCreate(frentistasToCreate);
         if (!isSuccess(sessoesRes)) {
            throw new Error(sessoesRes.error || 'Erro ao salvar sessões de frentistas');
         }
      }
   }

   // 4. Salvar Pagamentos (Recebimentos)
   const recebimentosToCreate = payments
      .filter(p => parseValue(p.valor) > 0)
      .map(p => ({
         fechamento_id: fechamento.id,
         forma_pagamento_id: p.id,
         valor: parseValue(p.valor),
         observacoes: 'Fechamento Geral'
      }));

   if (recebimentosToCreate.length > 0) {
      const recebimentosRes = await recebimentoService.bulkCreate(recebimentosToCreate);
      if (!isSuccess(recebimentosRes)) {
         throw new Error(recebimentosRes.error || 'Erro ao salvar pagamentos');
      }
   }

   // 5. Atualizar Status do Fechamento
   const updateRes = await fechamentoService.update(fechamento.id, {
      status: 'FECHADO',
      // Até 22/09/2026 gravava SEMPRE um número: sem encerrante, `calcularTotais` devolvia
      // 0, e o dia não apurado ficava com a cara do dia que bateu certo. CORRIGIDO em
      // 22/09/2026 (#103 P8) por consequência do tipo, não por remendo: a fonte passou a ser
      // `vendaDoDiaPeloEncerrante`, que devolve `null` quando há menos bicos lidos que ativos,
      // e `null` chega aqui e vai para a coluna (que aceita NULL pela migration
      // `20260904_fechamento_nao_apurado_e_nulo.sql`) — o mesmo que `fechamento.service.ts:166`
      // e `api-core/encerrante.ts` já gravavam. `null` é "ninguém apurou"; `0` é "apurou e deu
      // zero". Decisão do dono em 21/09/2026: aceitar o `null` aqui, sem `?? 0`.
      // O que este caminho ainda NÃO faz: `diferenca` abaixo continua 0 no dia não apurado
      // (o par inteiro só vai nulo no caminho da API, `montarDiaDeclarado.ts`).
      total_vendas: totalVendas,
      total_recebido: totalFrentistas,
      diferenca: diferenca,
      observacoes: observacoes
   });

   if (!isSuccess(updateRes)) {
      throw new Error(updateRes.error || 'Erro ao finalizar fechamento');
   }
}
