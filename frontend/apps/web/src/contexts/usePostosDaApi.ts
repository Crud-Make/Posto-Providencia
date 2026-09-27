import { useCallback, useMemo, useState } from 'react';
import type { Posto } from '../types/database/index';
import type { PerfilDaApi, PostoDoUsuario } from '../services/api/sessao.api';
import type { PostoContextType } from './PostoContext';
import { useAuth } from './useAuth';

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

/**
 * A escolha do posto. Feita na tela de entrada ANTES da senha, nasce sem sessão (`sessao: null`) e
 * vale para o login que vem em seguida; feita com alguém logado, vale só para aquela sessão — saiu e
 * entrou, é outro perfil, e a escolha antiga não conta.
 */
interface Escolha {
  sessao: PerfilDaApi | null;
  postoId: number;
}

/**
 * Posto ativo no login pela API (#102): a lista é a do perfil (só os postos do vínculo), e o ativo
 * é o que a pessoa escolheu na tela de entrada.
 *
 * @remarks Regra do dono (27/09/2026): uma tela só — os cartões dos postos e, no mesmo lugar, o
 *          e-mail e a senha. O navegador não guarda o posto (nada de `localStorage`): recarregou,
 *          escolhe de novo. Posto escolhido que a conta não tem não fica ativo (`null`), e a tela de
 *          entrada recusa o acesso.
 */
export function usePostosDaApi(): PostoContextType {
  const { usuario, carregando } = useAuth();
  const [escolha, setEscolha] = useState<Escolha | null>(null);

  const postos = useMemo(() => (usuario?.postos ?? []).map(postoDoPerfil), [usuario]);

  const postoAtivo = useMemo(() => {
    if (escolha === null || usuario === null) return null;
    if (escolha.sessao !== null && escolha.sessao !== usuario) return null;
    return postos.find((p) => p.id === escolha.postoId) ?? null;
  }, [postos, escolha, usuario]);

  const setPostoAtivo = useCallback(
    (posto: Posto) => setEscolha({ sessao: usuario, postoId: posto.id }),
    [usuario],
  );

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
