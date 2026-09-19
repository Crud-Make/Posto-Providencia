import type React from 'react';
import ReloadPrompt from './ReloadPrompt';

/** Ícone do lucide-react, tipado pelo que estas telas usam. */
type IconeDeTela = React.ComponentType<{ size?: number; className?: string }>;

/** Barreira das abas que só fazem sentido com um frentista escolhido. */
export const SelecioneOFrentista = ({ Icone, aoVoltar, nav }: {
  Icone: IconeDeTela;
  aoVoltar: () => void;
  nav: React.ReactNode;
}) => (
  <div className="flex flex-col min-h-screen bg-[#0A0D14] text-slate-100 font-sans items-center justify-center p-8">
    <ReloadPrompt />
    <Icone size={48} className="text-slate-600 mb-4" />
    <p className="text-slate-400 font-semibold text-center">Selecione um frentista primeiro</p>
    <button onClick={aoVoltar} className="mt-4 bg-indigo-600 px-6 py-3 rounded-xl text-white font-bold">Voltar ao Registro</button>
    {nav}
  </div>
);
