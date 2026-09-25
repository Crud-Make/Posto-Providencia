import { z } from 'zod';

/**
 * Payload que o App grava em `FechamentoFrentista` ao fechar o turno do frentista.
 *
 * @remarks Os mesmos 15 campos da interface que morava em `services/api.ts` (P8, 22/09/2026),
 *          agora como schema para o tipo sair de um lugar só (`z.infer`). Sem coerção e sem
 *          validação em runtime no envio: quem monta os valores é o `App.tsx` (fórmula
 *          canônica de `@posto/utils`), e o schema aqui só dá o formato.
 */
export const fechamentoFrentistaPayloadSchema = z.object({
  fechamento_id: z.number(),
  frentista_id: z.number(),
  posto_id: z.number(),
  encerrante: z.number(),
  valor_pix: z.number(),
  valor_dinheiro: z.number(),
  valor_moedas: z.number(),
  baratao: z.number(),
  valor_nota: z.number(),
  valor_cartao_debito: z.number(),
  valor_cartao_credito: z.number(),
  valor_cartao: z.number(),
  valor_conferido: z.number(),
  diferenca_calculada: z.number(),
  observacoes: z.string(),
});

export type FechamentoFrentistaPayload = z.infer<typeof fechamentoFrentistaPayloadSchema>;

/**
 * Linha devolvida por `insert(...).select().single()`: a linha inteira, das quais o app só
 * lê o `id` (para avisar o dono). `looseObject` para não cortar as outras colunas do retorno.
 */
export const linhaCriadaSchema = z.looseObject({ id: z.number() });

export type LinhaCriada = z.infer<typeof linhaCriadaSchema>;

/** `select('id')` do Fechamento do dia/turno: zero ou mais linhas (ou `null`). */
export const idsDeFechamentoSchema = z.array(z.object({ id: z.number() })).nullable();

/**
 * Envio já feito no dia (`getEnviosDoDia`): colunas do `select` com os dois joins many-to-one,
 * que em runtime vêm como objeto único. Numéricos nuláveis onde a coluna é nulável no banco.
 */
export const envioDoDiaSchema = z.object({
  id: z.number(),
  frentista_id: z.number(),
  valor_conferido: z.number().nullable(),
  encerrante: z.number().nullable(),
  diferenca_calculada: z.number().nullable(),
  data_hora_envio: z.string().nullable(),
  frentista: z.object({ nome: z.string() }).nullable(),
  fechamento: z.object({ data: z.string(), posto_id: z.number().nullable() }).nullable(),
});

export type EnvioDoDia = z.infer<typeof envioDoDiaSchema>;

export const enviosDoDiaSchema = z.array(envioDoDiaSchema).nullable();

/** Item do histórico do frentista (`getHistoricoFrentista`), com o pai `Fechamento(data, turno_id)`. */
export const itemDoHistoricoSchema = z.object({
  id: z.number(),
  encerrante: z.number().nullable(),
  valor_pix: z.number().nullable(),
  valor_dinheiro: z.number().nullable(),
  valor_moedas: z.number().nullable(),
  valor_cartao_debito: z.number().nullable(),
  valor_cartao_credito: z.number().nullable(),
  valor_nota: z.number().nullable(),
  baratao: z.number().nullable(),
  diferenca_calculada: z.number().nullable(),
  valor_conferido: z.number().nullable(),
  observacoes: z.string().nullable(),
  data_hora_envio: z.string().nullable(),
  fechamento: z.object({ data: z.string(), turno_id: z.number().nullable() }).nullable(),
});

export type ItemDoHistorico = z.infer<typeof itemDoHistoricoSchema>;

export const historicoSchema = z.array(itemDoHistoricoSchema).nullable();
