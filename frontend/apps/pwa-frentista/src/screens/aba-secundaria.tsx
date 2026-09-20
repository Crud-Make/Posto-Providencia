import type React from 'react';
import { History, ShoppingBag } from 'lucide-react';
import HistoricoScreen from './HistoricoScreen';
import VendasScreen from './VendasScreen';
import TanquesScreen from './TanquesScreen';
import ReloadPrompt from '../components/ReloadPrompt';
import { SelecioneOFrentista } from '../components/selecione-o-frentista';
import type { TabType, FrentistaSelecionavel } from '../lib/tipos';

/**
 * As abas que não são o Registro. Devolve `null` quando a aba pedida cai na tela
 * principal (`registro` e `perfil`), que continua em `AppComponent`.
 *
 * @remarks Estas três telas eram três blocos `if (activeTab === …)` dentro de
 *          `AppComponent`, cada um com sua própria guarda de frentista — juntos
 *          respondiam por boa parte do CCN 26 da função, acima do teto de 20 do
 *          gate. A guarda também estava duplicada palavra por palavra entre
 *          Histórico e Vendas, mudando só o ícone.
 *
 *          Tanques não exige frentista de propósito (#74): medição é do TANQUE.
 *          Como a `Leitura`, `HistoricoTanque` não tem coluna de frentista.
 */
export const abaSecundaria = ({ aba, frentista, aoVoltar, nav }: {
  aba: TabType;
  frentista: FrentistaSelecionavel | null;
  aoVoltar: () => void;
  nav: React.ReactNode;
}): React.ReactNode | null => {
  if (aba === 'tanques') {
    return (
      <>
        <ReloadPrompt />
        <TanquesScreen onVoltar={aoVoltar} />
        {nav}
      </>
    );
  }

  if (aba === 'historico') {
    if (!frentista) return <SelecioneOFrentista Icone={History} aoVoltar={aoVoltar} nav={nav} />;
    return (
      <>
        <ReloadPrompt />
        <HistoricoScreen frentistaId={frentista.id} frentistaNome={frentista.nome} onVoltar={aoVoltar} />
        {nav}
      </>
    );
  }

  if (aba === 'vendas') {
    if (!frentista) return <SelecioneOFrentista Icone={ShoppingBag} aoVoltar={aoVoltar} nav={nav} />;
    return (
      <>
        <ReloadPrompt />
        <VendasScreen frentistaId={frentista.id} frentistaNome={frentista.nome} onVoltar={aoVoltar} />
        {nav}
      </>
    );
  }

  return null;
};
