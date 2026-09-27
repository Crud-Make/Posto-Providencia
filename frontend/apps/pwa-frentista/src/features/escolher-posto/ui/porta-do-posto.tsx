import type React from 'react';
import type { PostoAtual } from '@frentista/entities/posto';
import { useEscolhaDePosto } from '../model/use-escolha-de-posto';
import { TelaEscolherPosto } from './tela-escolher-posto';

interface PortaDoPostoProps {
  /** Estável (função de módulo): ver `useEscolhaDePosto`. */
  readonly aoMudarDePosto: () => void;
  /** O app, já dentro de um posto. Recebe o posto por parâmetro, nunca de constante. */
  readonly children: (atual: PostoAtual) => React.ReactNode;
}

/**
 * A porta do PWA: nada do app abre antes de haver um posto (#101). O posto é escolhido NA HORA, a
 * cada abertura (decisão do dono, 27/09/2026); com um posto só na rede, entra direto nele.
 */
export const PortaDoPosto = ({ aoMudarDePosto, children }: PortaDoPostoProps) => {
  const { estado, escolher, trocar, tentarDeNovo } = useEscolhaDePosto(aoMudarDePosto);

  switch (estado.etapa) {
    case 'carregando':
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0A0D14] text-slate-400 text-sm">
          Carregando os postos...
        </div>
      );
    case 'erro':
      return (
        <div className="flex flex-col min-h-screen items-center justify-center gap-4 bg-[#0A0D14] p-5 text-center">
          <p className="text-red-400 font-medium">Não deu para carregar os postos: {estado.mensagem}</p>
          <button type="button" onClick={tentarDeNovo} className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold">
            Tentar de novo
          </button>
        </div>
      );
    case 'perguntar':
      return <TelaEscolherPosto postos={estado.postos} aoEscolher={escolher} />;
    case 'escolhido':
      return <>{children({ posto: estado.posto, podeTrocar: estado.postos.length > 1, trocarPosto: trocar })}</>;
  }
};
