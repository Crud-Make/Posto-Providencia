/**
 * Rótulos do card "Lucro Estimado" do dashboard — lógica pura, sem React, para ter teste.
 *
 * Legado do strangler (`components/dashboard`, fora das regras FSD até migrar): mora ao lado do
 * componente que consome, extraído de `index.tsx` em 18/09/2026 (#100, fatia 2).
 *
 * @module RotulosDoDashboard
 */
import { deIsoLocal, paraMesLocal } from '@posto/utils';
import type { JanelaDoRateio } from '../../services/api/dashboard.api';

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

/**
 * Rótulo do mês civil de onde saíram compra e despesa — só quando ele tem mais de um mês
 * (`jan–fev/2026`). Acontece pela API Laravel em período que atravessa meses: compra e rateio
 * somam todos os meses civis do período (decisão do dono, 18/09/2026), e o dono precisa ver
 * isso na tela, não descobrir pelo número. Dentro de um mês devolve `null`.
 */
export function rotuloDaJanelaDoRateio(janela: JanelaDoRateio | undefined): string | null {
  if (janela === undefined) return null;
  const inicio = deIsoLocal(janela.inicio);
  const fim = deIsoLocal(janela.fim);
  if (paraMesLocal(inicio) === paraMesLocal(fim)) return null;
  const mesCurto = (d: Date): string => MESES_CURTOS[d.getMonth()] ?? '';
  return inicio.getFullYear() === fim.getFullYear()
    ? `${mesCurto(inicio)}–${mesCurto(fim)}/${fim.getFullYear()}`
    : `${mesCurto(inicio)}/${inicio.getFullYear()}–${mesCurto(fim)}/${fim.getFullYear()}`;
}

/** Legenda do card "Lucro Estimado": de onde veio o custo, e o que faltou para calcular. */
export function legendaDoLucro(
  produtosSemCompra: readonly string[] | undefined,
  janelaDoRateio: JanelaDoRateio | undefined,
): string {
  const janela = rotuloDaJanelaDoRateio(janelaDoRateio);
  const semCompra = produtosSemCompra ?? [];
  if (semCompra.length > 0) {
    return `sem compra de ${semCompra.join(', ')} ${janela === null ? 'no mês' : `em ${janela}`}`;
  }
  return janela === null ? 'Custo da compra do mês' : `Custo e despesa de ${janela}`;
}
