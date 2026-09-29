import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Pencil, Loader2 } from 'lucide-react';
import type { PerfilDaApi } from '../services/api/sessao.api';
import { postosDaRede } from '../services/api/sessao.api';
import { descreverErroDaApi } from '../services/api/base';
import { enderecoDaFoto, podeTrocarFotoDoPosto, TAMANHO_MAXIMO_DA_FOTO, trocarFotoDoPosto } from '../services/api/foto-do-posto.api';
import { mensagemDeFoto, reduzirFoto } from '../shared/lib/reduzir-foto';

/** O caminho versionado da foto do posto, lido da lista pública (a mesma dos cartões de entrada). */
function useCaminhoDaFoto(postoId: number): [string | null, (caminho: string | null) => void] {
  const [caminho, setCaminho] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    void postosDaRede().match(
      (postos) => ativo && setCaminho(postos.find((p) => p.id === postoId)?.foto ?? null),
      () => undefined,
    );
    return () => {
      ativo = false;
    };
  }, [postoId]);
  return [caminho, setCaminho];
}

interface Props {
  postoId: number;
  nome: string;
  usuario: PerfilDaApi | null;
  /** Barra recolhida: some o nome e a canetinha, fica só a miniatura. */
  classeDoTexto: string;
}

/**
 * A fachada do posto no topo da barra lateral, com a canetinha para trocar (pedido do dono,
 * 27/09/2026). A canetinha só aparece para quem pode trocar; a foto nova vale para os cartões da
 * tela de entrada e para o PWA do frentista.
 */
const FotoDoPosto: React.FC<Props> = ({ postoId, nome, usuario, classeDoTexto }) => {
  const [caminho, setCaminho] = useCaminhoDaFoto(postoId);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const foto = enderecoDaFoto(caminho);
  const pode = podeTrocarFotoDoPosto(usuario, postoId);

  const aoEscolher = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (arquivo === undefined) return;
    setErro(null);
    setEnviando(true);
    await reduzirFoto(arquivo, TAMANHO_MAXIMO_DA_FOTO)
      .mapErr(mensagemDeFoto)
      .andThen((dataUrl) => trocarFotoDoPosto(postoId, dataUrl).mapErr(descreverErroDaApi))
      .match(setCaminho, setErro);
    setEnviando(false);
  };

  return (
    <div className="mx-6 mb-2">
      <div className="flex items-center gap-2">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
          {foto === null ? (
            <MapPin size={16} className="absolute inset-0 m-auto text-marca-vermelho" aria-hidden="true" />
          ) : (
            <img src={foto} alt={`Fachada do ${nome}`} className="h-full w-full object-cover" />
          )}
        </div>
        <span className={`truncate text-sm font-semibold text-gray-700 dark:text-gray-200 ${classeDoTexto}`} data-testid="posto-da-barra">
          {nome}
        </span>
        {pode && (
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={enviando}
            title="Trocar a foto do posto"
            aria-label={`Trocar a foto do ${nome}`}
            className={`ml-auto shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 ${classeDoTexto}`}
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
          </button>
        )}
      </div>
      {pode && <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={(e) => void aoEscolher(e)} />}
      {erro !== null && (
        <p role="alert" className={`mt-1 text-xs text-red-500 ${classeDoTexto}`}>
          {erro}
        </p>
      )}
    </div>
  );
};

export default FotoDoPosto;
