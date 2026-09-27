import React, { useEffect, useState } from 'react';
import { Loader2, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { usePosto } from '../../contexts/usePosto';
import { useTheme } from '../../contexts/useTheme';
import { loginPelaApiLigado } from '../../services/api/base';
import { postosDaRede, type PostoDaRede } from '../../services/api/sessao.api';
import type { Posto } from '../../types/database/index';
import CartaoDoPosto from './cartao-do-posto';
import { fraseDoDia, saudacao, variaveisDoTema } from './escolha-de-posto-estilo';
import FormularioDeEntrada from './formulario-de-entrada';

const FAIXA = ['#042992', '#A30E19', '#E5BE41'] as const;

type ListaDePostos = { estado: 'carregando' } | { estado: 'pronta'; postos: PostoDaRede[] } | { estado: 'falhou' };

/** Os postos dos cartões. Sem o login pela API não há lista pública: o formulário aparece sozinho. */
function usePostosDaTela(): ListaDePostos {
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

  return lista;
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
    void sair().then(() => setRecusa(mensagem));
  }, [usuario, postoAtivo, escolhido, sair]);

  return recusa;
}

/**
 * A tela de entrada do painel — a ÚNICA (regra do dono, 27/09/2026, sobre o canvas "Escolha de
 * Posto — Rede Providência"): logo, saudação e frase do dia à esquerda; à direita, os cartões dos
 * postos e, na mesma tela, o e-mail e a senha do posto escolhido. Entrou, o painel abre direto
 * nesse posto. Sai a tela de login com a foto de fundo e a escolha de posto depois do login.
 *
 * @remarks Nada fica no navegador: nem o posto, nem o token, nem o e-mail. Recarregou ou saiu,
 *          esta tela volta. Com o login pelo Supabase (flag desligada, produção da transição) não
 *          há lista pública de postos, e o formulário aparece sem os cartões.
 */
const TelaDeEntrada: React.FC = () => {
  const { setPostoAtivo } = usePosto();
  const { theme, toggleTheme } = useTheme();
  const lista = usePostosDaTela();
  const [escolhido, setEscolhido] = useState<PostoDaRede | null>(null);
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

  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-12" style={{ ...variaveisDoTema(theme), background: 'var(--fundo)', color: 'var(--texto)' }}>
      <div className="absolute inset-x-0 top-0 grid h-1.5 grid-cols-3" aria-hidden="true">
        {FAIXA.map((cor) => (
          <div key={cor} style={{ background: cor }} />
        ))}
      </div>

      <aside className="flex flex-col gap-6 px-5 pb-6 pt-9 lg:col-span-5 lg:justify-between lg:border-r lg:px-10 lg:py-14 xl:col-span-4" style={{ background: 'var(--painel)', borderColor: 'var(--linha)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="rounded-xl bg-white px-3 py-2">
            <img src="/logo-providencia.png" alt="Posto Providência" className="h-auto w-44 lg:w-64" />
          </div>
          <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'} className="flex h-11 w-11 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--borda-botao)', background: 'var(--botao)', color: 'var(--texto-medio)' }}>
            {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--acento)' }}>{saudacao(agora, '')}</span>
          <div className="h-1 w-12 rounded-sm bg-[#E5BE41]" aria-hidden="true" />
          <p className="font-display text-2xl font-semibold leading-tight lg:text-4xl">{fraseDoDia(agora)}</p>
        </div>
        <p className="hidden text-sm italic lg:block" style={{ color: 'var(--texto-suave)' }}>Jesus te ama</p>
      </aside>

      <main className="flex flex-col justify-center gap-6 px-5 pb-8 lg:col-span-7 lg:px-14 lg:py-16 xl:col-span-8">
        {comCartoes && (
          <>
            <h1 className="text-base font-bold lg:font-display lg:text-xl">Escolha o posto para começar</h1>
            {lista.estado === 'carregando' && <Loader2 className="h-6 w-6 animate-spin" aria-label="Carregando os postos" />}
            {lista.estado === 'falhou' && <p role="alert" style={{ color: 'var(--acento)' }}>Não foi possível carregar os postos. Confira a internet e recarregue a página.</p>}
            {lista.estado === 'pronta' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
                {lista.postos.map((posto) => (
                  <CartaoDoPosto key={posto.id} id={posto.id} nome={posto.nome} selecionado={escolhido?.id === posto.id} aoEscolher={() => escolher(posto)} />
                ))}
              </div>
            )}
          </>
        )}

        {(!comCartoes || escolhido !== null) && (
          <section className="w-full max-w-md rounded-2xl border p-6" style={{ background: 'var(--painel)', borderColor: 'var(--borda-cartao)' }} aria-label="Entrar">
            <h2 className="mb-5 font-display text-xl font-semibold">{escolhido === null ? 'Entrar no painel' : `Entrar no ${escolhido.nome}`}</h2>
            <FormularioDeEntrada key={escolhido?.id ?? 0} erroExterno={recusa} />
          </section>
        )}

        <p className="text-sm" style={{ color: 'var(--texto-suave)' }}>
          © {agora.getFullYear()} Rede Providência. Todos os direitos reservados.
        </p>
      </main>
    </div>
  );
};

export default TelaDeEntrada;
