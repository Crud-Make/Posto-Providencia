import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { fotoDoPosto, iniciaisDoPosto, type Posto } from '@frentista/entities/posto';

interface CartaoDoPostoProps {
  readonly posto: Posto;
  readonly aoEscolher: (posto: Posto) => void;
}

/** O lugar da foto quando o posto não tem uma: as iniciais num círculo, nas cores da marca. */
const Iniciais = ({ nome }: { readonly nome: string }) => (
  <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--azul-fundo)' }}>
    <span
      data-testid="iniciais-do-posto"
      aria-hidden="true"
      className="flex h-20 w-20 items-center justify-center rounded-full border-2 font-display text-3xl font-bold"
      style={{ color: 'var(--azul)', borderColor: 'var(--azul)' }}
    >
      {iniciaisDoPosto(nome)}
    </span>
  </div>
);

/**
 * Um posto da rede na tela de escolha: foto da fachada (`/postos/<id>.jpg`) e o nome. Se a foto
 * não carrega — o arquivo não existe, ou a rede caiu —, o `onError` troca pelas iniciais. O cartão
 * inteiro é o botão: alvo grande para o dedo, foco visível no teclado.
 */
export const CartaoDoPosto = ({ posto, aoEscolher }: CartaoDoPostoProps) => {
  const [semFoto, setSemFoto] = useState(false);
  return (
    <button
      type="button"
      onClick={() => aoEscolher(posto)}
      aria-label={posto.nome}
      className="flex w-full flex-col overflow-hidden rounded-2xl border text-left transition duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:[outline-color:var(--azul)]"
      style={{ background: 'var(--cartao)', borderColor: 'var(--borda-cartao)' }}
    >
      <div className="h-36 w-full">
        {semFoto ? (
          <Iniciais nome={posto.nome} />
        ) : (
          <img
            src={fotoDoPosto(posto)}
            alt={posto.nome}
            className="h-full w-full object-cover"
            onError={() => setSemFoto(true)}
          />
        )}
      </div>
      <div className="flex min-h-14 items-center justify-between gap-3 px-5 py-4">
        <span className="font-display text-xl font-semibold" style={{ color: 'var(--texto)' }}>
          {posto.nome}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm font-bold" style={{ color: 'var(--acento)' }} aria-hidden="true">
          Entrar
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
    </button>
  );
};
