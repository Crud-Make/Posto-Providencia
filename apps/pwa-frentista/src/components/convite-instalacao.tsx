import { Download, Share, SquarePlus, X } from 'lucide-react';
import { useConviteInstalacao } from '../lib/use-convite-instalacao';

/**
 * Convida o frentista a colocar o app na tela inicial do celular.
 *
 * Só desenha; toda a decisão de quando e o que mostrar está em
 * `lib/instalacao.ts` (pura, testada) e em `lib/use-convite-instalacao.ts`.
 */
function ConviteInstalacao() {
  const { convite, instalar, dispensar } = useConviteInstalacao();

  if (convite === 'oculto') return null;

  return (
    // Posição: acima da barra de navegação (fixed bottom-0, ~86px) — em
    // bottom-0 cobriria Registro/Vendas/Histórico.
    //
    // z-40 é deliberadamente BAIXO: o modal "Quem é você?" (z-100), a barra de
    // salvar de Vendas (z-50) e os diálogos (z-9999) precisam ganhar. Convite
    // de instalação nunca pode ficar na frente de botão de trabalho.
    <div className="fixed bottom-24 left-0 right-0 z-40 px-3">
      <div className="bg-[#131722] rounded-2xl border border-slate-700/70 shadow-lg shadow-black/40 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Download size={20} className="text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-sm leading-tight">
              {convite === 'abrir-no-safari' ? 'Abra no Safari para instalar' : 'Instalar na tela inicial'}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {convite === 'abrir-no-safari'
                ? 'Neste navegador o iPhone não deixa instalar. Toque nos três pontos e escolha "Abrir no Safari".'
                : 'Abre como aplicativo, sem barra do navegador, e funciona sem internet.'}
            </p>

            {convite === 'abrir-no-safari' ? null : convite === 'instrucoes-ios' ? (
              // O iOS não tem prompt: o único caminho é o menu Compartilhar.
              // Por isso aqui são instruções, e não um botão que não existiria.
              <ol className="mt-3 space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-slate-500">1.</span>
                  Toque em
                  <Share size={14} className="text-sky-400 shrink-0" aria-label="Compartilhar" />
                  na barra do Safari
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-slate-500">2.</span>
                  Escolha
                  <SquarePlus size={14} className="text-sky-400 shrink-0" aria-hidden="true" />
                  <strong className="font-semibold text-white">Adicionar à Tela de Início</strong>
                </li>
              </ol>
            ) : (
              <button
                type="button"
                onClick={instalar}
                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl py-2.5 transition-colors"
              >
                Instalar agora
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={dispensar}
            aria-label="Dispensar convite de instalação"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 shrink-0 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConviteInstalacao;
