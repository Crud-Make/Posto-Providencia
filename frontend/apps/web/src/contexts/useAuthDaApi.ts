import { useCallback, useEffect, useMemo, useState } from 'react';
import { lerTokenDaApi } from '../services/api/token-da-api';
import { entrarNaApi, entrarNoPosto, mensagemDoLogin, perfilDaSessao, sairDaApi, type PerfilDaApi } from '../services/api/sessao.api';
import type { EstadoAutenticacao } from './AuthContext';

const SEM_RECUPERACAO =
  'A recuperação por e-mail ainda não existe no sistema novo. Peça ao administrador para redefinir a sua senha.';

/**
 * Estado de autenticação quando o painel loga pela própria API (#102, `VITE_API_LOGIN=1`).
 *
 * @remarks Ao abrir, confere o token guardado em `/api/eu`: token vencido ou revogado vira tela
 *          de login, sem painel meio-logado. Sem SMTP ainda, "esqueci a senha" responde com a
 *          instrução em vez de fingir que mandou e-mail.
 */
export function useAuthDaApi(): EstadoAutenticacao {
  const [usuario, setUsuario] = useState<PerfilDaApi | null>(null);
  const [carregando, setCarregando] = useState(() => lerTokenDaApi() !== null);

  useEffect(() => {
    if (lerTokenDaApi() === null) return;
    let ativo = true;
    void perfilDaSessao().match(
      (perfil) => {
        if (ativo) setUsuario(perfil);
      },
      () => undefined,
    ).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const entrar = useCallback(
    async (login: string, senha: string, postoId?: number): Promise<string | null> =>
      // Com o posto do cartão e sem "@", é o nome de usuário daquele posto; senão, e-mail.
      (postoId !== undefined && !login.includes('@') ? entrarNoPosto(postoId, login, senha) : entrarNaApi(login, senha)).match(
        (perfil) => {
          setUsuario(perfil);
          return null;
        },
        mensagemDoLogin,
      ),
    [],
  );

  const sair = useCallback(async (): Promise<void> => {
    await sairDaApi().match(() => undefined, () => undefined);
    setUsuario(null);
  }, []);

  const semRecuperacao = useCallback(async (): Promise<string | null> => Promise.resolve(SEM_RECUPERACAO), []);

  return useMemo<EstadoAutenticacao>(
    () => ({
      sessao: null,
      usuario,
      carregando,
      autenticado: usuario !== null,
      recuperandoSenha: false,
      entrar,
      sair,
      pedirRecuperacaoSenha: semRecuperacao,
      definirNovaSenha: semRecuperacao,
    }),
    [usuario, carregando, entrar, sair, semRecuperacao],
  );
}
