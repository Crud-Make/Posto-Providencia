import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { decimalOuNuloDaApi, lerDaApi, type ErroDeApi } from '@frentista/shared/api';
import type { EnvioDoDia, ItemDoHistorico } from '../model/schema';

/**
 * As leituras do fechamento do frentista pela API Laravel (#101, fatia 2). Dinheiro chega em string
 * decimal e vira número só para a tela exibir (`decimalOuNuloDaApi`).
 */

/**
 * "Quem já enviou" no dia. Pela API, o `valor_conferido` do envio de OUTRO frentista vem `null`
 * (dado de caixa do colega não é dele) — a tela mostra "enviado" no lugar do valor.
 */
const enviosDoDiaSchema = z.object({
  data: z.array(z.object({
    id: z.number(),
    frentista_id: z.number(),
    frentista: z.object({ nome: z.string() }).nullable(),
    data_hora_envio: z.string().nullable(),
    valor_conferido: decimalOuNuloDaApi,
  })),
});

const historicoSchema = z.object({
  data: z.array(z.object({
    id: z.number(),
    encerrante: decimalOuNuloDaApi,
    valor_pix: decimalOuNuloDaApi,
    valor_dinheiro: decimalOuNuloDaApi,
    valor_moedas: decimalOuNuloDaApi,
    valor_cartao_debito: decimalOuNuloDaApi,
    valor_cartao_credito: decimalOuNuloDaApi,
    valor_nota: decimalOuNuloDaApi,
    baratao: decimalOuNuloDaApi,
    diferenca_calculada: decimalOuNuloDaApi,
    valor_conferido: decimalOuNuloDaApi,
    observacoes: z.string().nullable(),
    data_hora_envio: z.string().nullable(),
    fechamento: z.object({ data: z.string(), turno_id: z.number().nullable() }).nullable(),
  })),
});

export function buscarEnviosDoDiaPelaApi(postoId: number, token: string, data: string): ResultAsync<EnvioDoDia[], ErroDeApi> {
  return lerDaApi(`/api/postos/${postoId}/envios`, { data }, token, enviosDoDiaSchema).map((resposta) =>
    resposta.data.map((envio) => ({
      ...envio,
      encerrante: null,
      diferenca_calculada: null,
      fechamento: { data, posto_id: postoId },
    })),
  );
}

/** Os últimos 20 envios do frentista do TOKEN, do mais novo ao mais antigo. */
export function buscarHistoricoPelaApi(postoId: number, token: string): ResultAsync<ItemDoHistorico[], ErroDeApi> {
  return lerDaApi(`/api/postos/${postoId}/historico`, null, token, historicoSchema).map((resposta) => resposta.data);
}
