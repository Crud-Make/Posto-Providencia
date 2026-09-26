import { ResultAsync, okAsync } from 'neverthrow';
import { criarAcessoEncerrante, type ConsolidacaoDoDia } from '@posto/api-core';
import { conferirDepoisDeGravar, erroDeRede, executar, supabase, validar, type ErroDeApi } from '@frentista/shared/api';
import {
  enviosDoDiaSchema,
  historicoSchema,
  idsDeFechamentoSchema,
  linhaCriadaSchema,
  type EnvioDoDia,
  type FechamentoFrentistaPayload,
  type ItemDoHistorico,
  type LinhaCriada,
} from '../model/schema';

/**
 * Acesso ao encerrante compartilhado com o PWA do dono.
 *
 * @remarks A consolidação do pai (`Fechamento.total_vendas`/`diferenca`) vive em
 *          `packages/api-core` porque os dois apps precisam do MESMO comportamento —
 *          inclusive das correções que custaram caro ("ausência de leitura não é venda
 *          zero"). Aqui só se delega.
 */
const encerrante = criarAcessoEncerrante(supabase);

/** Reconsolida o `Fechamento` a partir do banco. Delegado a `@posto/api-core`. */
export function consolidarFechamento(fechamentoId: number): ResultAsync<ConsolidacaoDoDia | null, ErroDeApi> {
  return ResultAsync.fromPromise(encerrante.consolidarFechamento(fechamentoId), erroDeRede);
}

/** Cria o Fechamento do dia/turno, "não apurado". */
function criarFechamento(postoId: number, dataStr: string, turnoId: number, usuarioId: number): ResultAsync<number, ErroDeApi> {
  return executar(() =>
    supabase
      .from('Fechamento')
      .insert({
        posto_id: postoId,
        data: dataStr,
        turno_id: turnoId,
        // Venda e diferença nascem NULAS: "não apurado". Nasciam em 0 e o
        // dia sem encerrante tinha a cara do dia que bateu (04/09/2026).
        total_vendas: null,
        total_recebido: 0,
        diferenca: null,
        status: 'ABERTO',
        usuario_id: usuarioId,
      })
      .select()
      .single(),
  )
    .andThen(validar(linhaCriadaSchema, 'Fechamento (criado)'))
    .map((linha) => linha.id);
}

/**
 * Busca ou cria o Fechamento consolidado do dia/turno.
 *
 * @returns O `id` do primeiro Fechamento que já existe para (posto, data, turno); se não há
 *          nenhum, o `id` do que acabou de ser criado.
 */
export function buscarOuCriarFechamento(
  postoId: number,
  dataStr: string,
  turnoId: number,
  usuarioId: number = 1,
): ResultAsync<number, ErroDeApi> {
  return executar(() =>
    supabase
      .from('Fechamento')
      .select('id')
      .eq('posto_id', postoId)
      .eq('data', dataStr)
      .eq('turno_id', turnoId),
  )
    .andThen(validar(idsDeFechamentoSchema, 'Fechamento (do dia/turno)'))
    .andThen((fechamentos) => {
      const existente = fechamentos?.[0];
      if (existente !== undefined) return okAsync<number, ErroDeApi>(existente.id);
      return criarFechamento(postoId, dataStr, turnoId, usuarioId);
    });
}

/**
 * Envia o fechamento individual do frentista e reconsolida o pai.
 *
 * @remarks O pai nascia zerado e ficava assim até alguém abrir o painel — é a
 *          origem dos 12 dias que nunca fecharam. Agora todo filho gravado
 *          reconsolida o pai a partir do banco. A ordem é a de antes: insert, e só
 *          com o insert sem erro, a consolidação; o formato da linha é conferido depois.
 *
 *          O formato da linha NUNCA derruba o envio (revisão do lote 1, 22/09/2026): o insert
 *          já gravou, e um erro aqui faria o frentista reenviar — envio em dobro, problema de
 *          dinheiro. Linha fora do formato vira aviso no console e `Ok(null)`; sem `id`, o App
 *          só não avisa o dono.
 * @returns A linha criada, ou `null` se o banco a devolveu fora do formato.
 */
export function enviarFechamentoFrentista(payload: FechamentoFrentistaPayload): ResultAsync<LinhaCriada | null, ErroDeApi> {
  return executar(() =>
    supabase
      .from('FechamentoFrentista')
      .insert(payload)
      .select()
      .single(),
  )
    .andThen((linha) => consolidarFechamento(payload.fechamento_id).map(() => linha))
    .map(conferirDepoisDeGravar(linhaCriadaSchema, 'FechamentoFrentista (enviado)'));
}

/**
 * Avisa o celular do dono que este fechamento chegou.
 *
 * @remarks Manda só o `id`. A Edge Function monta o texto lendo a linha real
 *          do banco, para ninguém conseguir forjar um aviso. A falha volta como `Err`
 *          e **não pode** virar exceção para o envio: quem chama engole (ver a fachada).
 */
export function avisarDonoDoEnvio(fechamentoFrentistaId: number): ResultAsync<void, ErroDeApi> {
  return executar(() =>
    supabase.functions.invoke('notifica-dono', {
      body: { fechamentoFrentistaId },
    }),
  ).map(() => undefined);
}

/** Últimos 20 fechamentos do frentista, do mais novo para o mais antigo. */
export function buscarHistoricoDoFrentista(frentistaId: number): ResultAsync<ItemDoHistorico[], ErroDeApi> {
  return executar(() =>
    supabase
      .from('FechamentoFrentista')
      .select(`
        id, encerrante, valor_pix, valor_dinheiro, valor_moedas,
        valor_cartao_debito, valor_cartao_credito, valor_nota, baratao, diferenca_calculada,
        valor_conferido, observacoes, data_hora_envio,
        fechamento:Fechamento(data, turno_id)
      `)
      .eq('frentista_id', frentistaId)
      .order('id', { ascending: false })
      .limit(20),
  )
    .andThen(validar(historicoSchema, 'FechamentoFrentista (histórico)'))
    .map((linhas) => linhas ?? []);
}

/**
 * Envios já feitos no dia, de todos os frentistas — o "o que já foi" que o
 * frentista (e o dono, no replay) olha antes de mandar o próximo. Filtra pelo
 * `Fechamento.data` do pai: o envio é por dia, não por turno.
 */
export function buscarEnviosDoDia(postoId: number, dataStr: string): ResultAsync<EnvioDoDia[], ErroDeApi> {
  return executar(() =>
    supabase
      .from('FechamentoFrentista')
      .select(`
        id, frentista_id, valor_conferido, encerrante, diferenca_calculada, data_hora_envio,
        frentista:Frentista(nome),
        fechamento:Fechamento!inner(data, posto_id)
      `)
      .eq('fechamento.posto_id', postoId)
      .eq('fechamento.data', dataStr)
      .order('data_hora_envio', { ascending: true }),
  )
    .andThen(validar(enviosDoDiaSchema, 'FechamentoFrentista (envios do dia)'))
    .map((linhas) => linhas ?? []);
}
