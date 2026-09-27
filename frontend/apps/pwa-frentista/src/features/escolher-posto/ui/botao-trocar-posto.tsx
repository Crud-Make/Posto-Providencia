import { MapPin } from 'lucide-react';
import type { PostoAtual } from '@frentista/entities/posto';

/**
 * O posto escolhido, discreto no topo, e a troca (#101, 27/09/2026). Trocar encerra a sessão de
 * PIN e volta à tela "Escolha o posto". Com um posto só na rede não há troca, e o nome basta.
 */
export const BotaoTrocarPosto = ({ atual }: { readonly atual: PostoAtual }) => (
  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
    <span className="flex items-center gap-1.5">
      <MapPin size={12} />
      {atual.posto.nome}
    </span>
    {atual.podeTrocar && (
      <button type="button" onClick={atual.trocarPosto} className="underline underline-offset-2 hover:text-slate-200">
        Trocar posto
      </button>
    )}
  </div>
);
