import { useCallback, useMemo, useState } from 'react';
import type { Posto } from '../types/database/index';
import type { PostoDoUsuario } from '../services/api/sessao.api';
import type { PostoContextType } from './PostoContext';
import { useAuth } from './useAuth';

const CHAVE = 'postoAtivoId';

/** O `Posto` do painel a partir do que a API devolve no perfil: só id e nome são conhecidos. */
export function postoDoPerfil(posto: PostoDoUsuario): Posto {
  return {
    id: posto.id,
    nome: posto.nome,
    cnpj: null,
    endereco: null,
    cidade: null,
    estado: null,
    telefone: null,
    email: null,
    ativo: true,
    created_at: '',
    updated_at: '',
  };
}

function idGuardado(): number | null {
  try {
    const salvo = localStorage.getItem(CHAVE);
    const id = salvo === null ? Number.NaN : Number.parseInt(salvo, 10);
    return Number.isNaN(id) ? null : id;
  } catch {
    return null;
  }
}

function guardarId(id: number): void {
  try {
    localStorage.setItem(CHAVE, String(id));
  } catch {
    // Sem armazenamento, a escolha vale até recarregar a página.
  }
}

/**
 * Posto ativo no login pela API (#102): a lista é a do perfil (só os postos do vínculo), e o ativo
 * é o escolhido antes — se ainda estiver na lista —, ou o único, quando só há um.
 *
 * @remarks Com mais de um posto e nenhuma escolha válida, `postoAtivo` fica `null` e a porta de
 *          entrada mostra a tela "em qual posto você quer entrar?". Nunca cai num posto padrão:
 *          abrir o Jorro para quem queria o BR mostraria o dado de um posto no lugar do outro.
 */
export function usePostosDaApi(): PostoContextType {
  const { usuario, carregando } = useAuth();
  const [escolhido, setEscolhido] = useState<number | null>(idGuardado);

  const postos = useMemo(() => (usuario?.postos ?? []).map(postoDoPerfil), [usuario]);

  const postoAtivo = useMemo(() => {
    const doEscolhido = postos.find((p) => p.id === escolhido);
    if (doEscolhido !== undefined) return doEscolhido;
    return postos.length === 1 ? (postos[0] ?? null) : null;
  }, [postos, escolhido]);

  const setPostoAtivo = useCallback((posto: Posto) => {
    setEscolhido(posto.id);
    guardarId(posto.id);
  }, []);

  const setPostoAtivoById = useCallback(
    (id: number) => {
      const posto = postos.find((p) => p.id === id);
      if (posto !== undefined) setPostoAtivo(posto);
    },
    [postos, setPostoAtivo],
  );

  const refreshPostos = useCallback(async (): Promise<void> => Promise.resolve(), []);

  return useMemo<PostoContextType>(
    () => ({
      postos,
      postoAtivo,
      postoAtivoId: postoAtivo?.id ?? 0,
      loading: carregando,
      error: null,
      setPostoAtivo,
      setPostoAtivoById,
      refreshPostos,
    }),
    [postos, postoAtivo, carregando, setPostoAtivo, setPostoAtivoById, refreshPostos],
  );
}
