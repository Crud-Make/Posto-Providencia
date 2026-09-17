/**
 * Período de análise do painel — **um só para todas as telas de análise**.
 *
 * @remarks
 * O painel tinha 10 estados de data independentes, um por tela, cada um nascendo em `hojeIso()`.
 * Trocar o mês no dashboard geral não mexia no do proprietário: o gerente escolhia maio numa tela
 * e continuava vendo agosto na seguinte, sem nada indicando a diferença. Este contexto é o dono
 * único dessa data.
 *
 * **Uma verdade, três leituras.** O estado guardado é sempre um {@link Periodo} (intervalo de
 * dias), porque é a forma mais rica — dela se derivam as outras sem perda:
 * - tela de intervalo lê o período direto;
 * - tela de mês lê o mês de `fim`, e ao escolher um mês grava `intervaloDoMes` dele;
 * - tela de dia lê `fim`, e ao escolher um dia grava um período de um dia só.
 *
 * O corte em `hoje` no mês corrente vem de `intervaloDoMes` e **não é cosmético**: incluir dias
 * futuros faria o rateio de despesa por litro mentir para baixo. Ver `utils/periodo`.
 *
 * **Quem fica de fora, de propósito.** As telas de operação — fechamento diário e leituras
 * diárias — **não** consomem este contexto. Elas são onde se lança e se salva dinheiro, e herdar
 * a data de uma navegação de relatório abriria o fechamento num dia que o usuário não escolheu
 * ali. Elas lembram a própria data via `useEstadoPersistido`, com chave própria. Decisão do dono
 * em 14/08/2026 — não "conserte" isso ligando-as ao contexto.
 *
 * Também fica de fora a barra de filtros do painel financeiro, que por decisão de 31/07 é um
 * segundo eixo de tempo dentro do fechamento (ver o `@remarks` de `FiltrosFinanceiros`).
 */
import React, { createContext, useMemo } from 'react';
import { useEstadoPersistido } from '@shared/lib/estado-persistido';
import { hojeIso, intervaloDoMes, type Periodo } from '../utils/periodo';

export interface PeriodoContextType {
  /** A verdade guardada: um intervalo de dias em ISO local. */
  readonly periodo: Periodo;
  readonly definirPeriodo: (periodo: Periodo) => void;

  /** Projeção de mês (`aaaa-mm`), derivada do fim do período. */
  readonly mes: string;
  /** Grava o mês inteiro como período — cortado em hoje, se for o mês corrente. */
  readonly definirMes: (mes: string) => void;

  /** Projeção de dia (`aaaa-mm-dd`), derivada do fim do período. */
  readonly dia: string;
  /** Grava um período de um dia só. */
  readonly definirDia: (dia: string) => void;
}

const PeriodoContext = createContext<PeriodoContextType | undefined>(undefined);

/** Chave única: é ela que faz as telas de análise compartilharem o mesmo estado. */
const CHAVE = 'periodo-analise';

export const PeriodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [periodo, definirPeriodo] = useEstadoPersistido<Periodo>(CHAVE, () => {
    const hoje = hojeIso();
    return { inicio: hoje, fim: hoje };
  });

  const valor = useMemo<PeriodoContextType>(
    () => ({
      periodo,
      definirPeriodo,
      mes: periodo.fim.slice(0, 7),
      definirMes: (mes) => definirPeriodo(intervaloDoMes(mes, hojeIso())),
      dia: periodo.fim,
      definirDia: (dia) => definirPeriodo({ inicio: dia, fim: dia }),
    }),
    [periodo, definirPeriodo]
  );

  return <PeriodoContext.Provider value={valor}>{children}</PeriodoContext.Provider>;
};

/**
 * Contexto de período (objeto React puro, sem componente).
 * @remarks Exportado só como default para não violar `react-refresh/only-export-components`.
 *          O hook `usePeriodo` mora em `./usePeriodo.ts`, seguindo o mesmo arranjo do tema.
 */
export default PeriodoContext;
