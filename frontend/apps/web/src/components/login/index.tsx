import React, { useEffect, useState } from 'react';
import { Loader2, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { usePosto } from '../../contexts/usePosto';
import { useTheme } from '../../contexts/useTheme';
import { loginPelaApiLigado } from '../../services/api/base';
import { postosDaRede, type PostoDaRede } from '../../services/api/sessao.api';
import type { Posto } from '../../types/database/index';
import CartaoDoPosto from './cartao-do-posto';
import CenaDaChegada from './cena-da-chegada';
import { fraseDoDia, saudacao, variaveisDoTema } from './escolha-de-posto-estilo';
import FormularioDeEntrada from './formulario-de-entrada';
import { esquecerLogin, loginLembrado } from './login-lembrado';
import SenhaNoCartao from './senha-no-cartao';
import TrocarFotoNoCartao from './trocar-foto-no-cartao';

type ListaDePostos = { estado: 'carregando' } | { estado: 'pronta'; postos: PostoDaRede[] } | { estado: 'falhou' };

/** Os postos dos cartões. Sem o login pela API não há lista pública: o formulário aparece sozinho. */
function usePostosDaTela(): [ListaDePostos, (postoId: number, foto: string | null) => void] {
  const [lista, setLista] = useState<ListaDePostos>(() => (loginPelaApiLigado() ? { estado: 'carregando' } : { estado: 'pronta', postos: [] }));

  useEffect(() => {
    if (!loginPelaApiLigado()) return;
    let ativo = true;
    void postosDaRede().match(
      (postos) => ativo && setLista({ estado: 'pronta', postos }),
      () => ativo && setLista({ estado: 'falhou' }),
    );
    return () => {
      ativo = false;
    };
  }, []);

  // A foto trocada no cartão aparece na hora, sem recarregar a lista.
  const trocarFoto = (postoId: number, foto: string | null) =>
    setLista((atual) => (atual.estado === 'pronta' ? { estado: 'pronta', postos: atual.postos.map((p) => (p.id === postoId ? { ...p, foto } : p)) } : atual));

  return [lista, trocarFoto];
}

function comoPosto(posto: PostoDaRede): Posto {
  return { id: posto.id, nome: posto.nome, cnpj: null, endereco: null, cidade: null, estado: null, telefone: null, email: null, ativo: true, created_at: '', updated_at: '' };
}

/**
 * Recusa quem entrou com uma conta que não é do posto escolhido: sai na hora e diz por quê.
 * Cada posto tem as próprias contas (decisão do dono, 27/09/2026).
 */
function useRecusaContaDeOutroPosto(escolhido: PostoDaRede | null): string | null {
  const { usuario, sair } = useAuth();
  const { postoAtivo } = usePosto();
  const [recusa, setRecusa] = useState<string | null>(null);

  useEffect(() => {
    if (!loginPelaApiLigado() || usuario === null || postoAtivo !== null) return;
    const mensagem = `Esta conta não é do ${escolhido?.nome ?? 'posto escolhido'}.`;
    // O login lembrado era de outro posto: esquece, para a próxima entrada pedir o usuário de novo.
    if (escolhido !== null) esquecerLogin(escolhido.id);
    void sair().then(() => setRecusa(mensagem));
  }, [usuario, postoAtivo, escolhido, sair]);

  return recusa;
}

/** "Esqueceu a senha?" e "Entrar com outra conta", pequenos, embaixo dos cartões. */
const AjudaDaEntrada: React.FC<{ escolhido: PostoDaRede; aoTrocarConta: () => void }> = ({ escolhido, aoTrocarConta }) => {
  const { pedirRecuperacaoSenha } = useAuth();
  const [aviso, setAviso] = useState<string | null>(null);

  const aoEsquecer = async () => {
    // No modo API a resposta é sempre a instrução de pedir ao administrador (não há SMTP). O login
    // lembrado só serve de e-mail no caminho do Supabase, que não tem cartões.
    const login = loginLembrado(escolhido.id) ?? '';
    const falha = await pedirRecuperacaoSenha(login);
    setAviso(falha ?? `Enviamos o link de recuperação para ${login}.`);
  };

  return (
    <div className="flex flex-col gap-1 text-sm font-semibold text-[var(--terra-texto)]">
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <button type="button" onClick={() => void aoEsquecer()} className="underline-offset-4 hover:underline">
          Esqueceu a senha?
        </button>
        <button type="button" onClick={aoTrocarConta} className="underline-offset-4 hover:underline">
          Entrar com outra conta
        </button>
      </div>
      {aviso !== null && (
        <p role="status" className="max-w-xl font-medium">
          {aviso}
        </p>
      )}
    </div>
  );
};

/**
 * A tela de entrada do painel — a ÚNICA: a chegada a Caldas do Jorro ao entardecer (o pórtico, a
 * estrada e o Posto BR), a saudação no céu e, embaixo, um cartão por posto. Escolhido, o cartão mostra
 * só a senha (desenho aprovado pelo dono em 28/09/2026). Entrou, o painel abre direto nesse posto.
 *
 * @remarks No navegador fica só o usuário lembrado de cada posto; posto e token não. Com o login pelo
 *          Supabase (flag desligada, produção da transição) não há lista pública de postos, e o
 *          formulário completo aparece sozinho sobre a mesma cena.
 */
const TelaDeEntrada: React.FC = () => {
  const { setPostoAtivo } = usePosto();
  const { theme, toggleTheme } = useTheme();
  const [lista, trocarFotoDaLista] = usePostosDaTela();
  const [fotoEmTroca, setFotoEmTroca] = useState<{ posto: PostoDaRede; arquivo: File } | null>(null);
  const [escolhido, setEscolhido] = useState<PostoDaRede | null>(null);
  const [versaoDaConta, setVersaoDaConta] = useState(0);
  const recusa = useRecusaContaDeOutroPosto(escolhido);
  const agora = new Date();
  const comCartoes = loginPelaApiLigado();

  // O posto é marcado no clique do cartão, fora do envio do formulário. Marcado dentro do envio (uma
  // action do React 19), ele só era gravado depois do usuário, e nesse meio-tempo "usuário sem posto"
  // disparava a recusa de conta de outro posto: o painel entrava e saía sozinho (ensaio de 27/09).
  const escolher = (posto: PostoDaRede) => {
    setEscolhido(posto);
    setPostoAtivo(comoPosto(posto));
  };

  const trocarConta = () => {
    if (escolhido !== null) esquecerLogin(escolhido.id);
    setVersaoDaConta((v) => v + 1);
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden text-[var(--tinta)]"
      style={{ ...variaveisDoTema(theme), background: theme === 'dark' ? '#050A1E' : '#6F86C4' }}
    >
      {/* No celular a cena fica na parte de baixo e o céu liso fica atrás da saudação; com o pórtico
          em tela cheia, o letreiro caía em cima da frase do dia. */}
      <CenaDaChegada className="absolute inset-x-0 bottom-0 h-[60%] w-full sm:h-full" noite={theme === 'dark'} />

      <div className="relative flex min-h-screen flex-col gap-8 px-5 pb-6 pt-6 lg:px-16 lg:pb-10 lg:pt-12">
        <header className="flex items-start justify-between gap-4">
          <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_10px_26px_rgba(19,41,75,0.18)]">
            <img src="/logo-providencia.png" alt="Posto Providência" className="h-auto w-40 lg:w-56" />
          </div>
          <div className="flex items-center gap-5">
            <p className="hidden items-center gap-3 text-base font-medium italic lg:flex">
              <span className="h-0.5 w-8 bg-[#A30E19]" aria-hidden="true" />
              Jesus te ama
            </p>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cartao)] text-[var(--texto)] shadow-[0_8px_20px_rgba(19,41,75,0.2)]"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </header>

        <section className="flex max-w-xl flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--tinta-media)] lg:text-sm">
            {agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className="font-display text-5xl font-extrabold leading-[0.9] tracking-tight lg:text-[88px]">{saudacao(agora, '')}.</h1>
          <p className="text-lg font-medium leading-snug text-[var(--tinta)] lg:text-[22px]">{fraseDoDia(agora)}</p>
        </section>

        <div className="mt-auto flex flex-col gap-3">
          {comCartoes && (
            <>
              <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--terra-texto)]">Escolha o posto</h2>
              {lista.estado === 'carregando' && <Loader2 className="h-6 w-6 animate-spin" aria-label="Carregando os postos" />}
              {lista.estado === 'falhou' && (
                <p role="alert" className="font-semibold text-[var(--acento)]">
                  Não foi possível carregar os postos. Confira a internet e recarregue a página.
                </p>
              )}
              {lista.estado === 'pronta' && (
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5">
                  {lista.postos.map((posto) => (
                    <CartaoDoPosto
                      key={posto.id}
                      id={posto.id}
                      nome={posto.nome}
                      caminhoDaFoto={posto.foto ?? null}
                      selecionado={escolhido?.id === posto.id}
                      aoEscolher={() => escolher(posto)}
                      aoEscolherFoto={(arquivo) => setFotoEmTroca({ posto, arquivo })}
                    >
                      <SenhaNoCartao key={`${posto.id}-${versaoDaConta}`} postoId={posto.id} nome={posto.nome} erroExterno={recusa} />
                    </CartaoDoPosto>
                  ))}
                </div>
              )}
              {escolhido !== null && <AjudaDaEntrada escolhido={escolhido} aoTrocarConta={trocarConta} />}
            </>
          )}

          {!comCartoes && (
            <section className="w-full max-w-md rounded-2xl bg-[var(--painel)] p-6 text-[var(--texto)] shadow-[0_20px_44px_rgba(19,41,75,0.28)]" aria-label="Entrar">
              <h2 className="mb-5 font-display text-xl font-semibold">Entrar no painel</h2>
              <FormularioDeEntrada postoId={null} erroExterno={recusa} />
            </section>
          )}

          <p className="text-xs font-medium text-[var(--terra-texto)] opacity-80">© {agora.getFullYear()} Rede Providência</p>
        </div>
      </div>

      {fotoEmTroca !== null && (
        <TrocarFotoNoCartao
          postoId={fotoEmTroca.posto.id}
          nome={fotoEmTroca.posto.nome}
          arquivo={fotoEmTroca.arquivo}
          aoTrocar={(foto) => {
            trocarFotoDaLista(fotoEmTroca.posto.id, foto);
            setFotoEmTroca(null);
          }}
          aoFechar={() => setFotoEmTroca(null)}
        />
      )}
    </div>
  );
};

export default TelaDeEntrada;
