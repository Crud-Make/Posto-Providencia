import { z } from 'zod';
import { emCentavos } from '@posto/utils';
import type { FechamentoFrentistaPayload } from './schema';

/**
 * O envio do turno pela API Laravel (#101, `POST /api/postos/{posto}/envios`).
 *
 * @remarks Os VALORES são os mesmos do payload que o `App.tsx` monta para o Supabase (o contrato
 *          §2(a) do `docs/design/pwa-frentista-fsd.md` não muda): aqui só se tira o que o servidor
 *          decide sozinho — `fechamento_id` (o pai do dia), `frentista_id` (do TOKEN) e `posto_id`
 *          (da rota) — e se converte cada número em string decimal com duas casas, quantizada por
 *          `emCentavos` (a mesma forma do PUT do painel, `montarDiaDeclarado.ts`). Nenhuma conta nova.
 */
export type ValoresDoTurno = Omit<FechamentoFrentistaPayload, 'fechamento_id' | 'frentista_id' | 'posto_id'>;

/** As 11 colunas de dinheiro do payload, na ordem do `App.tsx`. */
const COLUNAS_DE_DINHEIRO = [
  'encerrante', 'valor_pix', 'valor_dinheiro', 'valor_moedas', 'baratao', 'valor_nota',
  'valor_cartao_debito', 'valor_cartao_credito', 'valor_cartao', 'valor_conferido', 'diferenca_calculada',
] as const;

type ColunaDeDinheiro = (typeof COLUNAS_DE_DINHEIRO)[number];

export type EnvioDoTurno = Record<ColunaDeDinheiro, string> & {
  readonly data: string;
  readonly chave: string;
  readonly observacoes: string;
};

/** Dinheiro no contrato: string decimal com duas casas, sobre valor já quantizado. */
const dinheiro = (reais: number): string => emCentavos(reais).toFixed(2);

export function paraEnvioDaApi(data: string, chave: string, valores: ValoresDoTurno): EnvioDoTurno {
  const convertidos = Object.fromEntries(
    COLUNAS_DE_DINHEIRO.map((coluna) => [coluna, dinheiro(valores[coluna])]),
  ) as Record<ColunaDeDinheiro, string>;

  return { data, chave, ...convertidos, observacoes: valores.observacoes };
}

/** A resposta 201/200 do envio. `consolidacao` é `null` quando o envio é a repetição de um já gravado. */
export const envioRegistradoSchema = z.object({
  data: z.object({
    id: z.number(),
    fechamento_id: z.number(),
    frentista_id: z.number(),
    data_hora_envio: z.string().nullable(),
    repetido: z.boolean(),
    consolidacao: z
      .object({
        apurado: z.boolean(),
        total_vendas: z.string().nullable(),
        total_recebido: z.string(),
        diferenca: z.string().nullable(),
      })
      .nullable(),
  }),
});

export type EnvioRegistrado = z.infer<typeof envioRegistradoSchema>['data'];
