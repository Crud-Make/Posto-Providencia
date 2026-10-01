import { clienteSupabase, supabaseConfigurado } from '../lib/supabase';
import { criarAcessoEncerrante } from '@posto/api-core';
import { ouLancar } from '../api/cliente';
import {
    gravarLeituras,
    lerBicos,
    lerDiasEmFalta,
    lerUltimasLeituras,
    paraUltimasLeituras,
    paraUltimosPrecos,
    type BicoRow,
    type DiaEmFalta,
    type LeituraDaApi,
    type LinhaParaGravar,
} from '../api/encerrante';
import { lerEnviosDoDia, type EnvioDeFechamento } from '../api/envios';
import { hojeIso } from '@posto/utils';

/**
 * Tudo que as telas do app do dono fazem contra o servidor — a mesma fachada de antes, com os
 * DADOS agora na API Laravel (#102, fatia 1).
 *
 * @remarks As telas continuam falando `Promise` e recebendo `number`: a conversão de string
 *          decimal e a validação do contrato moram em `src/api/`. O que ainda é Supabase, e de
 *          propósito: o OCR (`lerEncerrante`/`aquecerEncerrante`, Edge Function `ler-encerrante`),
 *          que muda na fatia 2, e o push (`lib/push.ts`), na fatia 3.
 */
/** Só a parte de OCR do api-core — e só quando alguém tira a foto (ver `clienteSupabase`). */
const ocr = () => criarAcessoEncerrante(clienteSupabase());

/**
 * Uma busca de "últimas leituras" por (posto, dia) em voo de cada vez.
 *
 * @remarks Encerrante inicial e preço herdado têm de vir do MESMO dia, e a tela pede os dois juntos
 *          (`Promise.all`). Uma requisição só para os dois é o que o `ultimaLinhaPorBico` do
 *          `api-core` garantia; sem isto seriam duas, e uma gravação no meio as faria divergir.
 */
const emVoo = new Map<string, Promise<LeituraDaApi[]>>();

const buscarUltimas = (postoId: number, antesDe: string): Promise<LeituraDaApi[]> =>
    ouLancar(lerUltimasLeituras(postoId, antesDe));

function ultimasLinhas(postoId: number, antesDe: string): Promise<LeituraDaApi[]> {
    const chave = `${postoId}|${antesDe}`;
    const existente = emVoo.get(chave);
    if (existente !== undefined) return existente;
    const pedido = buscarUltimas(postoId, antesDe).finally(() => emVoo.delete(chave));
    emVoo.set(chave, pedido);
    return pedido;
}

export const api = {
    /** Bicos ATIVOS do posto, por número, com o preço do cadastro já em `number`. */
    getBicos: (postoId: number): Promise<BicoRow[]> => ouLancar(lerBicos(postoId)),

    /** `bico_id` → última `leitura_final` de antes de `anteriorA` (padrão hoje). */
    getUltimasLeiturasPorBico: async (postoId: number, anteriorA?: string): Promise<Map<number, number>> =>
        paraUltimasLeituras(await ultimasLinhas(postoId, anteriorA ?? hojeIso())),

    /** `bico_id` → `preco_litro` do último dia lançado antes de `anteriorA`. */
    getUltimosPrecosPorBico: async (postoId: number, anteriorA?: string): Promise<Map<number, number>> =>
        paraUltimosPrecos(await ultimasLinhas(postoId, anteriorA ?? hojeIso())),

    diasEmFalta: (postoId: number, bicosEsperados: number): Promise<DiaEmFalta[]> =>
        ouLancar(lerDiasEmFalta(postoId, bicosEsperados)),

    /** Grava só os bicos preenchidos; recusa do servidor (fora da janela etc.) vira a mensagem dele. */
    salvarLeituras: (params: { postoId: number; data: string; linhas: LinhaParaGravar[] }): Promise<LeituraDaApi[]> =>
        ouLancar(gravarLeituras(params.postoId, params.data, params.linhas)),

    /** Envios dos frentistas no dia, com nome e foto, do mais antigo para o mais recente. */
    listarEnviosDoDia: (postoId: number, dataIso: string): Promise<EnvioDeFechamento[]> =>
        ouLancar(lerEnviosDoDia(postoId, dataIso)),

    aquecerEncerrante: (): void => { if (supabaseConfigurado()) ocr().aquecerEncerrante(); },
    lerEncerrante: (imagemBase64: string, mimeType: string) => ocr().lerEncerrante(imagemBase64, mimeType),
};
