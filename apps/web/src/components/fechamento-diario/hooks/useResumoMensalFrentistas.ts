import { useEffect, useState } from 'react';
import { cartao, conferido, diferenca, meiosFromFechamentoRow } from '@posto/utils';
import { fechamentoFrentistaService } from '../../../services/api/fechamentoFrentista.service';
import { isSuccess } from '../../../types/ui/response-types';
import { agruparPorFrentista, type LinhaFechamentoFrentista } from '../../../utils/fechamentoMeios';

/**
 * Uma coluna do bloco mensal: o que um frentista recebeu no mês, por forma de pagamento.
 *
 * @remarks
 * Espelha as linhas 884–894 do bloco `Caixa Dia 01 a 31` da aba do mês na planilha:
 * uma coluna por frentista, uma linha por forma, `Venda Frentistas.` como soma das
 * formas e `Falta.` = concentrador − frentistas (positivo = FALTA, §6).
 */
export interface ColunaMensalFrentista {
  readonly frentistaId: number | null;
  readonly nome: string;
  readonly pix: number;
  readonly credito: number;
  readonly debito: number;
  readonly moedas: number;
  readonly nota: number;
  readonly baratao: number;
  readonly dinheiro: number;
  /** `Venda Frentistas.` — soma das 7 formas (conferido canônico). */
  readonly vendaFrentista: number;
  /** `Venda Concentrador` — soma dos encerrantes enviados no mês. */
  readonly vendaConcentrador: number;
  /** `Falta.` — concentrador − frentistas. Positivo = FALTA. */
  readonly falta: number;
  /** Participação no caixa do mês (linha `%` da planilha), em 0–100. */
  readonly participacao: number;
  /** Quantos envios (dias) o frentista fez no mês. */
  readonly envios: number;
}

export interface ResumoMensalFrentistas {
  readonly colunas: ColunaMensalFrentista[];
  /** Coluna ` Caixa.` da planilha: soma de todos os frentistas. */
  readonly caixa: ColunaMensalFrentista;
  /** Primeiro do ranking por `Venda Frentistas.` — ver {@link frentistaDoMes}. */
  readonly frentistaDoMes: ColunaMensalFrentista | null;
  readonly carregando: boolean;
  readonly erro: string | null;
}

/** Primeiro e último dia (ISO local) do mês da data informada. */
export function limitesDoMes(dataIso: string): { inicio: string; fim: string } {
  const [ano, mes] = dataIso.split('-').map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const mm = String(mes).padStart(2, '0');
  return { inicio: `${ano}-${mm}-01`, fim: `${ano}-${mm}-${String(ultimoDia).padStart(2, '0')}` };
}

const VAZIA: ColunaMensalFrentista = {
  frentistaId: null, nome: '', pix: 0, credito: 0, debito: 0, moedas: 0, nota: 0, baratao: 0,
  dinheiro: 0, vendaFrentista: 0, vendaConcentrador: 0, falta: 0, participacao: 0, envios: 0,
};

/**
 * Monta as colunas do bloco mensal a partir das linhas cruas do banco.
 *
 * @remarks
 * O "frentista do mês" na planilha é quem tem a maior `Venda Frentistas.` (linha 893):
 * a linha `Litro Vendido` (895) divide essa venda pelo preço médio do mês, então o
 * ranking por litros é o mesmo ranking por venda. A `Participacao de Lucro` (896,
 * litros × 0,003) e o `Salario Pago` (899) derivam daí e ficam fora deste hook.
 *
 * Exportada pura para o teste ao lado cobrir a montagem sem Supabase.
 */
export function montarResumoMensal(
  linhas: readonly (LinhaFechamentoFrentista & { frentista?: { nome?: string | null } | null })[]
): Pick<ResumoMensalFrentistas, 'colunas' | 'caixa' | 'frentistaDoMes'> {
  const enviosPorFrentista = new Map<number | null, number>();
  const nomes = new Map<number | null, string>();
  for (const l of linhas) {
    const chave = l.frentista_id ?? null;
    enviosPorFrentista.set(chave, (enviosPorFrentista.get(chave) ?? 0) + 1);
    if (l.frentista?.nome) nomes.set(chave, l.frentista.nome);
  }

  const agrupadas = agruparPorFrentista(linhas);
  const totalCaixa = agrupadas.reduce((acc, l) => acc + conferido(meiosFromFechamentoRow(l)), 0);

  const colunas = agrupadas.map((l): ColunaMensalFrentista => {
    const m = meiosFromFechamentoRow(l);
    const vendaFrentista = conferido(m);
    const vendaConcentrador = Number(l.encerrante ?? 0);
    return {
      frentistaId: l.frentista_id ?? null,
      nome: nomes.get(l.frentista_id ?? null) ?? 'Sem frentista',
      pix: m.pix,
      credito: m.cartaoCredito,
      // Cartão legado (sem separar crédito/débito) entra no débito, como em `totaisDasLinhas`.
      debito: cartao(m) - m.cartaoCredito,
      moedas: m.moedas,
      nota: m.nota,
      baratao: m.baratao,
      dinheiro: m.dinheiro,
      vendaFrentista,
      vendaConcentrador,
      falta: diferenca(vendaConcentrador, vendaFrentista),
      participacao: totalCaixa > 0 ? (vendaFrentista / totalCaixa) * 100 : 0,
      envios: enviosPorFrentista.get(l.frentista_id ?? null) ?? 0,
    };
  }).sort((a, b) => b.vendaFrentista - a.vendaFrentista);

  const soma = (campo: keyof Omit<ColunaMensalFrentista, 'frentistaId' | 'nome'>) =>
    colunas.reduce((acc, c) => acc + c[campo], 0);

  const caixa: ColunaMensalFrentista = {
    ...VAZIA,
    nome: 'Caixa',
    pix: soma('pix'), credito: soma('credito'), debito: soma('debito'), moedas: soma('moedas'),
    nota: soma('nota'), baratao: soma('baratao'), dinheiro: soma('dinheiro'),
    vendaFrentista: soma('vendaFrentista'), vendaConcentrador: soma('vendaConcentrador'),
    falta: soma('falta'), participacao: colunas.length ? 100 : 0, envios: soma('envios'),
  };

  return { colunas, caixa, frentistaDoMes: colunas[0] ?? null };
}

/**
 * Carrega os envios de `FechamentoFrentista` do mês da data selecionada e consolida
 * por frentista e forma de pagamento.
 */
export function useResumoMensalFrentistas(postoId: number | null, dataIso: string | null): ResumoMensalFrentistas {
  type Carregado = Pick<ResumoMensalFrentistas, 'colunas' | 'caixa' | 'frentistaDoMes' | 'erro'> & { chave: string };
  const [carregado, setCarregado] = useState<Carregado | null>(null);

  // `carregando` é derivado, não estado: evita o setState síncrono no efeito.
  const chave = dataIso ? `${postoId ?? 0}|${limitesDoMes(dataIso).inicio}` : null;

  useEffect(() => {
    if (!dataIso || !chave) return;
    let ativo = true;
    const { inicio, fim } = limitesDoMes(dataIso);
    fechamentoFrentistaService.getByPeriodo(inicio, fim, postoId ?? undefined).then((resposta) => {
      if (!ativo) return;
      if (!isSuccess(resposta)) {
        setCarregado({ chave, colunas: [], caixa: { ...VAZIA, nome: 'Caixa' }, frentistaDoMes: null, erro: resposta.error });
        return;
      }
      setCarregado({ chave, ...montarResumoMensal(resposta.data), erro: null });
    });
    return () => { ativo = false; };
  }, [postoId, dataIso, chave]);

  if (!chave) {
    return { colunas: [], caixa: { ...VAZIA, nome: 'Caixa' }, frentistaDoMes: null, carregando: false, erro: null };
  }
  if (!carregado || carregado.chave !== chave) {
    return { colunas: [], caixa: { ...VAZIA, nome: 'Caixa' }, frentistaDoMes: null, carregando: true, erro: null };
  }
  const { chave: _chave, ...resto } = carregado;
  return { ...resto, carregando: false };
}
