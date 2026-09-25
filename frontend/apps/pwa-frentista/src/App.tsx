import React, { useState, useEffect, useRef } from 'react';
import {
  User, Calendar, Smartphone, Banknote,
  Coins, CircleDollarSign, FileText, CreditCard,
  ClipboardList, ShoppingBag, History, ChevronDown,
  X, Check, AlertCircle, Camera, Fuel
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { conferido, diferenca, isSobra, meiosFromPwaPayments } from '@posto/utils';
import { api } from './services/api';
import { abaSecundaria } from './screens/aba-secundaria';
import { ReloadPrompt } from '@frentista/shared/ui';
import { POSTO_ID, TURNO_CANONICO } from '@frentista/shared/config';
import { abaSalvaOuPadrao, dataFechamentoInicial, formatCurrency } from '@frentista/shared/lib';
import { useSinalDeVida } from './lib/use-sinal-de-vida';
import { reduzirParaAvatar, iniciais, mensagemDeFoto } from '@frentista/entities/frentista';
import { hojeIso } from '@posto/utils';
import type { TabType, FrentistaSelecionavel } from './lib/tipos';

interface EnvioDoDia {
  id: number;
  frentista_id: number;
  valor_conferido: number | null;
  data_hora_envio: string;
  frentista: { nome: string } | null;
}

/** Chave do `localStorage` onde a data escolhida sobrevive ao reload. */
const CHAVE_DATA_FECHAMENTO = 'pwa.dataFechamento';

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error';
}

interface PaymentCardProps {
  title: string;
  icon: LucideIcon;
  iconColor: { bg: string; text: string };
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Reusable card for payments
const PaymentCard = ({ title, icon: Icon, iconColor, value, onChange }: PaymentCardProps) => (
  <div className="bg-[#131722] rounded-2xl p-4 border border-slate-800/60 shadow-sm flex flex-col justify-between h-28">
    <div className="flex items-center gap-2 mb-2">
      <div className={`p-1.5 rounded-lg bg-opacity-10 flex items-center justify-center ${iconColor.bg}`}>
        <Icon size={16} className={iconColor.text} />
      </div>
      <span className={`text-[0.7rem] font-bold tracking-wider ${iconColor.text} uppercase`}>
        {title}
      </span>
    </div>
    <div className="flex items-end gap-1 border-b border-slate-700/50 pb-1">
      <span className="text-slate-400 font-medium text-sm mb-0.5">R$</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={onChange}
        className="bg-transparent text-white text-xl font-semibold w-full outline-none focus:ring-0"
        placeholder="0,00"
      />
    </div>
  </div>
);

/**
 * Foto do frentista, com as iniciais do nome como reserva.
 *
 * @param tamanho Lado em pixels — o texto das iniciais acompanha, senão a
 *                inicial de 18px fica perdida dentro de um círculo de 40px.
 */
const AvatarFrentista = ({ frentista, tamanho }: { frentista: FrentistaSelecionavel; tamanho: number }) => {
  const medida = { width: tamanho, height: tamanho };

  if (frentista.foto) {
    return (
      <img
        src={frentista.foto}
        alt={`Foto de ${frentista.nome}`}
        style={medida}
        className="rounded-full object-cover border border-red-800/50 bg-red-900/40"
      />
    );
  }

  return (
    <div style={medida} className="rounded-full bg-red-900/40 flex items-center justify-center border border-red-800/50">
      <span className="text-red-500 font-bold" style={{ fontSize: Math.round(tamanho * 0.36) }}>
        {iniciais(frentista.nome)}
      </span>
    </div>
  );
};

/**
 * "Quem já mandou hoje" — evita envio em dobro e mostra em que dia o registro caiu.
 * Três estados: falha ao carregar, dia vazio, ou a lista.
 */
const ListaDeEnviosDoDia = ({ erro, envios, aoTentarDeNovo }: {
  erro: string | null;
  envios: EnvioDoDia[];
  aoTentarDeNovo: () => void;
}) => {
  if (erro) {
    return (
      <button
        type="button"
        onClick={aoTentarDeNovo}
        className="text-xs text-red-300 text-left underline underline-offset-2"
      >
        Não deu para carregar os envios do dia — toque para tentar de novo
      </button>
    );
  }

  if (envios.length === 0) {
    return <p className="text-xs text-slate-500">Nenhum envio neste dia ainda.</p>;
  }

  return (
    <ul className="divide-y divide-slate-800/80">
      {envios.map((e) => (
        <li key={e.id} className="py-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{e.frentista?.nome ?? 'Frentista'}</p>
            <p className="text-[11px] text-slate-500 font-mono">
              {new Date(e.data_hora_envio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <p className="text-sm font-bold text-emerald-400 font-mono whitespace-nowrap">
            R$ {Number(e.valor_conferido ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </li>
      ))}
    </ul>
  );
};

/**
 * Folha de rosto para escolher quem está no turno.
 *
 * @remarks Saiu de dentro de `AppComponent` (CCN 26 → acima do teto de 20 do
 *          gate) porque não conversa com o resto da tela: recebe a lista, devolve
 *          a escolha.
 *
 *          O "8 frentistas ativos" do cabeçalho é literal no código desde antes
 *          desta extração — não veio de `frentistas.length`. Mantido como estava
 *          para esta mudança não misturar refatoração com correção de conteúdo.
 */
const ModalDeFrentistas = ({ frentistas, selecionado, aoEscolher, aoFechar }: {
  frentistas: FrentistaSelecionavel[];
  selecionado: FrentistaSelecionavel | null;
  aoEscolher: (frentista: FrentistaSelecionavel) => void;
  aoFechar: () => void;
}) => (
  <div className="fixed inset-0 z-[100] flex flex-col justify-end">
    <div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={aoFechar}
    />

    <div className="bg-[#0A0D14] w-full rounded-t-[2rem] pt-6 flex flex-col h-[85vh] relative z-10 transform transition-transform shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      {/* Header Vermelho */}
      {/* z-30 > z-20 da lista: a lista tem pt-28 e cobria o cabeçalho inteiro, e o toque no X
          caía nela — o botão de fechar ficava morto. */}
      <div className="bg-[#D32F2F] absolute top-0 left-0 right-0 h-28 rounded-t-[2rem] flex items-start justify-between p-6 overflow-hidden z-30">
        <div className="z-10">
          <h2 className="text-2xl font-bold text-white mb-0.5">Quem está trabalhando?</h2>
          <p className="text-red-100/80 text-sm">8 frentistas ativos</p>
        </div>
        <button
          onClick={aoFechar}
          className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center z-10 border border-white/10"
        >
          <X size={20} className="text-white" />
        </button>
        {/* Elemento Decorativo no fundo vermelho */}
        <div className="absolute right-[-20%] bottom-[-50%] w-64 h-64 bg-red-600 rounded-full blur-3xl opacity-50" />
      </div>

      {/* Lista de Frentistas que rola por cima da parte vermelha */}
      <div className="flex-1 overflow-y-auto px-5 pt-28 pb-10 z-20">
        <div className="text-xl font-bold mb-6 text-slate-100 px-2 opacity-90">Quem é você?</div>
        <div className="space-y-3 overflow-y-auto max-h-[60vh] pb-8 px-2 scrollbar-none">
          {frentistas.map((frentista) => (
            <div
              key={frentista.id}
              onClick={() => aoEscolher(frentista)}
              className={`w-full text-left px-5 py-4 rounded-xl font-bold tracking-wide transition-all border flex items-center gap-4
            ${selecionado?.id === frentista.id
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                  : 'bg-[#131722] text-slate-300 border-slate-800/80 hover:bg-slate-800/60 active:bg-slate-800'
                }`}
            >
              <AvatarFrentista frentista={frentista} tamanho={40} />
              <span className="truncate">{frentista.nome}</span>
            </div>
          ))}
          {frentistas.length === 0 && <p className="text-slate-400 text-sm italic py-4">Carregando conta dos funcionários...</p>}
        </div>
      </div>
    </div>
  </div>
);

const AppComponent = ({ setDialog }: { setDialog: React.Dispatch<React.SetStateAction<DialogState>> }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Persistimos frentista e aba: no mobile, abrir a câmera pode descarregar a
  // página da memória e recarregar ao voltar — sem isso o app perdia o estado
  // e "voltava pra tela inicial".
  const [selectedFrentista, setSelectedFrentista] = useState<FrentistaSelecionavel | null>(() => {
    try { const s = localStorage.getItem('pwa.frentista'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [frentistas, setFrentistas] = useState<FrentistaSelecionavel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  // Histórico de enviados do dia (todos os frentistas): recarrega ao trocar a data
  // e depois de cada envio. É o "quem já mandou" que evita envio em dobro e mostra
  // na hora em que dia o registro caiu.
  const [enviosDoDia, setEnviosDoDia] = useState<EnvioDoDia[]>([]);
  const [enviosVersao, setEnviosVersao] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try { return abaSalvaOuPadrao(localStorage.getItem('pwa.activeTab')); } catch { return 'registro'; }
  });

  useEffect(() => {
    // Busca do banco POSTO ID: 1 como padrão (Pode vir de config/storage depois)
    api.getFrentistas(POSTO_ID).then(data => {
      if (!data) return;
      setFrentistas(data);
      // `selectedFrentista` vem do localStorage e carrega a foto de quando foi
      // escolhido. Sem casar com o que acabou de chegar do banco, trocar a foto
      // num aparelho deixaria o outro mostrando a inicial antiga até alguém se
      // reselecionar na lista.
      setSelectedFrentista(atual => {
        if (!atual) return atual;
        const fresco = data.find(f => f.id === atual.id);
        return fresco ? { ...atual, foto: fresco.foto } : atual;
      });
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    try {
      if (selectedFrentista) localStorage.setItem('pwa.frentista', JSON.stringify(selectedFrentista));
      else localStorage.removeItem('pwa.frentista');
    } catch { /* ignora */ }
  }, [selectedFrentista]);

  useEffect(() => {
    try { localStorage.setItem('pwa.activeTab', activeTab); } catch { /* ignora */ }
  }, [activeTab]);

  // Aparece como "trabalhando agora" no painel do dono enquanto o app estiver
  // aberto com um frentista escolhido.
  useSinalDeVida(selectedFrentista?.id ?? null, POSTO_ID);

  /**
   * Troca a foto de perfil do frentista escolhido neste aparelho.
   *
   * @remarks Grava no banco na hora da escolha, e não junto com o fechamento.
   *          Abrir a câmera no celular pode descarregar a página da memória — é
   *          o mesmo motivo de `selectedFrentista` viver no localStorage —, e
   *          uma foto que só existisse em estado do React morreria nesse
   *          recarregamento sem nenhum aviso.
   */
  const trocarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; // permite reescolher a mesma foto depois de um erro
    if (!arquivo || !selectedFrentista) return;

    const alvo = selectedFrentista;
    setSalvandoFoto(true);
    try {
      // A redução devolve Result (RES-1): a falha dela não passa pelo `catch`.
      // O `catch` abaixo segue só para `api.salvarFotoFrentista`, que ainda é
      // legada e lança (Decisão B do Design Doc pwa-frentista-fsd).
      const reduzido = await reduzirParaAvatar(arquivo);
      if (reduzido.isErr()) {
        setDialog({
          isOpen: true,
          title: 'Não deu para salvar a foto',
          message: mensagemDeFoto(reduzido.error),
          type: 'error',
        });
        return;
      }
      const avatar = reduzido.value;
      await api.salvarFotoFrentista(alvo.id, avatar);

      setSelectedFrentista(atual => (atual && atual.id === alvo.id ? { ...atual, foto: avatar } : atual));
      setFrentistas(lista => lista.map(f => (f.id === alvo.id ? { ...f, foto: avatar } : f)));
    } catch (err) {
      setDialog({
        isOpen: true,
        title: 'Não deu para salvar a foto',
        message: err instanceof Error ? err.message : 'Tente novamente.',
        type: 'error',
      });
    } finally {
      setSalvandoFoto(false);
    }
  };

  const [totalVendido, setTotalVendido] = useState('');
  const [payments, setPayments] = useState({
    pix: '',
    dinheiro: '',
    moedas: '',
    baratao: '',
    notaPrazo: '',
    debito: '',
    credito: ''
  });
  // A data sobrevive ao reload: em 19/08/2026 um reload do dev server zerou a data
  // para hoje no meio do replay e um envio de 01/01 caiu em 01/19 — só o mês tinha
  // sido trocado de novo. Mesmo padrão de `pwa.frentista` e `pwa.activeTab`.
  // Só vale no dia em que foi gravada — ver `dataFechamentoInicial`.
  const [dataFechamento, setDataFechamento] = useState(() => {
    try { return dataFechamentoInicial(localStorage.getItem(CHAVE_DATA_FECHAMENTO)); } catch { return hojeIso(); }
  });
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_DATA_FECHAMENTO, JSON.stringify({ data: dataFechamento, gravadoEm: hojeIso() }));
    } catch { /* ignora */ }
  }, [dataFechamento]);
  /** Falha ao carregar os envios do dia — distinta de "ninguém enviou ainda". */
  const [erroEnvios, setErroEnvios] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    api.getEnviosDoDia(POSTO_ID, dataFechamento)
      .then((rows) => { if (ativo) { setEnviosDoDia(rows as unknown as EnvioDoDia[]); setErroEnvios(null); } })
      .catch((err: unknown) => {
        if (!ativo) return;
        // Lista vazia por erro NÃO é "ninguém enviou": a trava de envio em dobro
        // se apoia nesta lista, e o frentista precisa saber que ela não carregou.
        setEnviosDoDia([]);
        setErroEnvios(err instanceof Error ? err.message : 'Falha ao carregar os envios.');
      });
    return () => { ativo = false; };
  }, [dataFechamento, enviosVersao]);
  /** Pedido de confirmação pendente por a data não ser hoje. Ver `handleSubmit`. */
  const [confirmarDataDiferente, setConfirmarDataDiferente] = useState(false);

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalVendido(formatCurrency(e.target.value));
  };

  const handlePaymentChange = (field: keyof typeof payments) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPayments(prev => ({ ...prev, [field]: formatCurrency(e.target.value) }));
  };

  // Conferido (reais) via módulo canônico: soma dos 7 buckets declarados.
  const conferidoReais = () => conferido(meiosFromPwaPayments(payments));
  const encerranteReais = () => (parseInt(totalVendido.replace(/\D/g, ''), 10) || 0) / 100;

  const renderDifference = () => {
    const encReais = encerranteReais();
    if (encReais === 0) {
      return <p className="text-slate-400 font-medium">Informe o encerrante para ver o status</p>;
    }

    // diferenca canônica: encerrante − conferido (positivo = FALTA/quebra).
    // Exibe em módulo; o rótulo (Sobra/Quebra) indica a direção.
    const dif = diferenca(encReais, conferidoReais());
    const formattedDiff = Math.abs(dif).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (dif === 0) {
      return <p className="text-green-400 font-medium flex items-center gap-1"><Check size={16} /> Tudo certo!</p>;
    } else if (isSobra(dif)) {
      return <p className="text-green-400 font-medium flex items-center gap-1"><AlertCircle size={16} /> ⬆️ Sobra de Caixa (R$ {formattedDiff})</p>;
    }
    return <p className="text-red-400 font-medium flex items-center gap-1"><AlertCircle size={16} /> ⬇️ Quebra de Caixa (R$ {formattedDiff})</p>;
  };

  const handleSubmit = async () => {
    if (!selectedFrentista) {
      setDialog({ isOpen: true, title: 'Atenção', message: 'Selecione um frentista antes de enviar.', type: 'error' });
      return;
    }

    const valueEncerrante = parseInt(totalVendido.replace(/\D/g, ''), 10) / 100;
    if (isNaN(valueEncerrante) || valueEncerrante === 0) {
      setDialog({ isOpen: true, title: 'Valor Inválido', message: 'O encerrante não pode ser R$ 0,00.', type: 'error' });
      return;
    }

    // A data é o único campo desta tela que vem preenchido e que ninguém relê.
    // Enviar o caixa de um dia inteiro para a data errada não dá erro nenhum —
    // grava certinho no dia errado, e só aparece quando o dono abre o dia certo e
    // não acha nada. Aconteceu duas vezes em 19/08/2026, com o dono testando.
    // Hoje segue sem atrito; dia diferente exige um "sim" consciente.
    if (dataFechamento !== hojeIso() && !confirmarDataDiferente) {
      setConfirmarDataDiferente(true);
      return;
    }

    // Um envio por frentista por dia. `FechamentoFrentista` não tem unique em
    // (fechamento_id, frentista_id) e `consolidarFechamento` SOMA os filhos —
    // um segundo toque do mesmo frentista dobraria o caixa do dia no pai.
    // Migration 20260819_fechamento_frentista_unico_por_dia cobre o banco; esta
    // trava dá a mensagem legível antes de bater nele.
    if (enviosDoDia.some((e) => e.frentista_id === selectedFrentista.id)) {
      setConfirmarDataDiferente(false);
      setDialog({
        isOpen: true,
        title: 'Já enviado',
        message: `${selectedFrentista.nome} já enviou o fechamento de ${new Date(dataFechamento + 'T00:00:00').toLocaleDateString('pt-BR')}. Para corrigir, fale com o gerente no painel.`,
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const dataStr = dataFechamento;
      const postoId = POSTO_ID;
      // Universal (pedido do dono): frentista não escolhe turno. Todos os envios do
      // dia caem num turno canônico único e a web mostra o dia inteiro (getByDate).
      const turnoId = TURNO_CANONICO;

      // Chama a lógica inteligente da interface
      const fechamentoId = await api.getOrCreateFechamento(postoId, dataStr, turnoId);

      const payload = {
        fechamento_id: fechamentoId,
        frentista_id: selectedFrentista.id,
        posto_id: postoId,
        encerrante: valueEncerrante,
        valor_pix: parseInt(payments.pix.replace(/\D/g, ''), 10) / 100 || 0,
        valor_dinheiro: parseInt(payments.dinheiro.replace(/\D/g, ''), 10) / 100 || 0,
        valor_moedas: parseInt(payments.moedas.replace(/\D/g, ''), 10) / 100 || 0,
        baratao: parseInt(payments.baratao.replace(/\D/g, ''), 10) / 100 || 0,
        valor_nota: parseInt(payments.notaPrazo.replace(/\D/g, ''), 10) / 100 || 0,
        valor_cartao_debito: parseInt(payments.debito.replace(/\D/g, ''), 10) / 100 || 0,
        valor_cartao_credito: parseInt(payments.credito.replace(/\D/g, ''), 10) / 100 || 0,
        valor_cartao: 0,
        valor_conferido: conferidoReais(),
        diferenca_calculada: diferenca(encerranteReais(), conferidoReais()),
        observacoes: "Fechamento via PWA Frentista"
      };

      const enviado = await api.submitFrentistaClosing(payload) as { id?: number } | null;

      // Dispara e segue, sem `await`: o frentista não deve esperar a rede do
      // aviso para ver "enviado com sucesso", e `avisarDono` engole os próprios
      // erros de propósito — o porquê está no JSDoc dela.
      if (enviado?.id) void api.avisarDono(enviado.id);

      setEnviosVersao((v) => v + 1);
      setConfirmarDataDiferente(false);
      setDialog({ isOpen: true, title: 'Sucesso!', message: 'Registro de Turno enviado com sucesso!', type: 'success' });
      // Limpa os dados
      setTotalVendido('');
      setPayments({ pix: '', dinheiro: '', moedas: '', baratao: '', notaPrazo: '', debito: '', credito: '' });
      setSelectedFrentista(null);

    } catch (err) {
      // Desarma a confirmação de data: sem isso o próximo toque enviaria direto,
      // sem o "sim" consciente que a data diferente de hoje exige.
      setConfirmarDataDiferente(false);
      setDialog({ isOpen: true, title: 'Erro', message: err instanceof Error ? err.message : 'Ocorreu um erro no servidor.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0F131D] border-t border-slate-800/80 px-8 pt-1 pb-3 flex justify-between items-center z-50">
      <div onClick={() => setActiveTab('registro')} className="flex flex-col items-center gap-0.5 cursor-pointer">
        <div className={`w-12 h-6 rounded-full flex items-center justify-center ${activeTab === 'registro' ? 'bg-[#FF756B]/10' : ''}`}>
          <ClipboardList size={16} className={activeTab === 'registro' ? 'text-[#FF756B]' : 'text-slate-400'} />
        </div>
        <span className={`text-[9px] font-bold tracking-wide ${activeTab === 'registro' ? 'text-[#FF756B]' : 'text-slate-400'}`}>Registro</span>
      </div>
      <div onClick={() => setActiveTab('vendas')} className="flex flex-col items-center gap-0.5 cursor-pointer">
        <div className={`w-12 h-6 rounded-full flex items-center justify-center ${activeTab === 'vendas' ? 'bg-emerald-500/10' : ''}`}>
          <ShoppingBag size={16} className={activeTab === 'vendas' ? 'text-emerald-400' : 'text-slate-400'} />
        </div>
        <span className={`text-[9px] font-bold tracking-wide ${activeTab === 'vendas' ? 'text-emerald-400' : 'text-slate-400'}`}>Vendas</span>
      </div>
      <div onClick={() => setActiveTab('historico')} className="flex flex-col items-center gap-0.5 cursor-pointer">
        <div className={`w-12 h-6 rounded-full flex items-center justify-center ${activeTab === 'historico' ? 'bg-indigo-500/10' : ''}`}>
          <History size={16} className={activeTab === 'historico' ? 'text-indigo-400' : 'text-slate-400'} />
        </div>
        <span className={`text-[9px] font-bold tracking-wide ${activeTab === 'historico' ? 'text-indigo-400' : 'text-slate-400'}`}>Histórico</span>
      </div>
      <div onClick={() => setActiveTab('tanques')} className="flex flex-col items-center gap-0.5 cursor-pointer">
        <div className={`w-12 h-6 rounded-full flex items-center justify-center ${activeTab === 'tanques' ? 'bg-cyan-500/10' : ''}`}>
          <Fuel size={16} className={activeTab === 'tanques' ? 'text-cyan-400' : 'text-slate-400'} />
        </div>
        <span className={`text-[9px] font-bold tracking-wide ${activeTab === 'tanques' ? 'text-cyan-400' : 'text-slate-400'}`}>Tanques</span>
      </div>
    </div>
  );

  // Histórico, Tanques e Vendas moram em `abaSecundaria`; `registro` e `perfil`
  // caem na tela principal abaixo.
  const secundaria = abaSecundaria({
    aba: activeTab,
    frentista: selectedFrentista,
    aoVoltar: () => setActiveTab('registro'),
    nav: renderBottomNav(),
  });
  if (secundaria !== null) return <>{secundaria}</>;

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0D14] text-slate-100 font-sans pb-24">
      <ReloadPrompt />
      <div className="p-5 flex-1 space-y-4">

        {/* Selecionar Frentista */}
        <div
          onClick={() => setIsModalOpen(true)}
          className="bg-[#131722] rounded-3xl p-4 border border-slate-800/60 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="flex items-center gap-4">
            {selectedFrentista ? (
              <button
                type="button"
                /* O card inteiro abre a lista de frentistas. Sem parar a
                   propagação, tocar no avatar para trocar a foto abriria a
                   lista por baixo do seletor de imagem do celular. */
                onClick={(e) => { e.stopPropagation(); inputFotoRef.current?.click(); }}
                disabled={salvandoFoto}
                aria-label={`Trocar a foto de ${selectedFrentista.nome}`}
                className="relative shrink-0 rounded-full active:scale-95 transition-transform disabled:opacity-60"
              >
                <AvatarFrentista frentista={selectedFrentista} tamanho={48} />
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-indigo-600 border-2 border-[#131722] flex items-center justify-center">
                  {salvandoFoto
                    ? <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    : <Camera size={10} className="text-white" />}
                </span>
              </button>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-900/40 flex items-center justify-center border border-red-800/50 shrink-0">
                <User size={24} className="text-red-500" />
              </div>
            )}
            {/* Sem `capture`: no iPhone isso é o que faz o iOS oferecer "Tirar
                foto" E "Escolher da biblioteca". Com `capture="user"` ele abre
                a câmera direto, e quem já tem uma foto boa na galeria perde o
                caminho mais curto. */}
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={trocarFoto}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">
                  <span>{selectedFrentista ? selectedFrentista.nome : 'Selecionar Frentista'}</span>
                </h2>
                <ChevronDown size={16} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-400 mt-0.5">Posto Jorro</p>
            </div>
          </div>
          {selectedFrentista ? (
            <div className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-sm font-semibold border border-indigo-500/30">
              Mudar
            </div>
          ) : (
            <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-semibold border border-blue-500/30">
              Obrigatório
            </div>
          )}
        </div>

        {/* Data do Fechamento */}
        <div className="bg-[#131722] rounded-3xl p-4 border border-slate-800/60 flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-900/20 flex items-center justify-center border border-blue-800/30">
              <Calendar size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-0.5">Data do Fechamento</p>
              <h2 className="text-lg font-bold text-white leading-tight">
                {new Date(dataFechamento + 'T00:00:00').toLocaleDateString('pt-BR')}
              </h2>
            </div>
          </div>
          {/* Dia/Mês/Ano em selects diretos, em vez do calendário nativo: no celular
              ele obriga a rolar mês a mês para chegar numa data antiga (o replay
              começa em 01/01), e o mês escolhido de uma vez é o que o dono pediu. */}
          <div className="flex items-center gap-2 w-full">
            {(() => {
              const [anoStr, mesStr, diaStr] = dataFechamento.split('-');
              const ano = Number(anoStr), mes = Number(mesStr), dia = Number(diaStr);
              const anoAtual = new Date().getFullYear();
              const anos = Array.from({ length: anoAtual - 2025 + 1 }, (_, i) => 2025 + i);
              const diasNoMes = new Date(ano, mes, 0).getDate();
              const pad = (n: number) => String(n).padStart(2, '0');
              const mudar = (a: number, m: number, d: number) => {
                const maxDia = new Date(a, m, 0).getDate();
                setDataFechamento(`${a}-${pad(m)}-${pad(Math.min(d, maxDia))}`);
                setConfirmarDataDiferente(false);
              };
              const cls = 'flex-1 min-w-0 bg-[#1C2230] text-white font-bold text-sm rounded-lg px-2 py-2 border border-slate-700/60 outline-none';
              return (
                <>
                  <select aria-label="Dia" className={cls} value={dia} onChange={(e) => mudar(ano, mes, Number(e.target.value))}>
                    {Array.from({ length: diasNoMes }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{pad(d)}</option>)}
                  </select>
                  <select aria-label="Mês" className={cls} value={mes} onChange={(e) => mudar(ano, Number(e.target.value), dia)}>
                    {MESES_CURTOS.map((nome, i) => <option key={nome} value={i + 1}>{nome}</option>)}
                  </select>
                  <select aria-label="Ano" className={cls} value={ano} onChange={(e) => mudar(Number(e.target.value), mes, dia)}>
                    {anos.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </>
              );
            })()}
          </div>
        </div>

        {/* Data diferente de hoje fica gritando na tela até o envio. O campo vem
            preenchido e ninguém relê o que já está certo — foi assim que o caixa
            de um dia inteiro foi para a data errada duas vezes em 19/08/2026. */}
        {dataFechamento !== hojeIso() && (
          <div className={`rounded-2xl p-4 border ${confirmarDataDiferente
            ? 'bg-amber-500/15 border-amber-500/50'
            : 'bg-amber-500/10 border-amber-500/30'}`}>
            <p className="text-amber-300 font-bold text-sm flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              Este caixa NÃO é de hoje
            </p>
            <p className="text-amber-200/80 text-xs mt-1 leading-relaxed">
              Vai ser lançado em{' '}
              <strong>{new Date(dataFechamento + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>.
              {confirmarDataDiferente
                ? ' Toque em enviar de novo para confirmar.'
                : ' Confira antes de enviar.'}
            </p>
          </div>
        )}

        {/* Conferência de Vendas (Roxo) */}
        <div className="bg-gradient-to-br from-[#5B4EFF] to-[#7B61FF] rounded-[1.75rem] p-5 shadow-lg shadow-indigo-500/20 mt-2">
          <h2 className="text-white font-bold text-base mb-2">Total</h2>
          <div className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2 backdrop-blur-sm border border-white/20">
            <span className="text-white/70 font-bold text-base">R$</span>
            <input
              type="text"
              inputMode="numeric"
              value={totalVendido}
              onChange={handleTotalChange}
              className="bg-transparent text-white text-xl font-bold w-full outline-none focus:ring-0 placeholder:text-white/30"
              placeholder="0,00"
            />
          </div>
        </div>

        {/* Recebimentos */}
        <div className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💰</span>
            <h2 className="text-xl font-bold text-white">Recebimentos</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4 font-medium">Toque nos campos para preencher os valores</p>

          <div className="grid grid-cols-2 gap-3">
            <PaymentCard title="PIX" icon={Smartphone} iconColor={{ bg: 'bg-[#06B6D4]/20', text: 'text-[#06B6D4]' }} value={payments.pix} onChange={handlePaymentChange('pix')} />
            <PaymentCard title="Dinheiro" icon={Banknote} iconColor={{ bg: 'bg-[#10B981]/20', text: 'text-[#10B981]' }} value={payments.dinheiro} onChange={handlePaymentChange('dinheiro')} />
            <PaymentCard title="Moedas" icon={Coins} iconColor={{ bg: 'bg-[#F59E0B]/20', text: 'text-[#F59E0B]' }} value={payments.moedas} onChange={handlePaymentChange('moedas')} />
            <PaymentCard title="Baratão" icon={CircleDollarSign} iconColor={{ bg: 'bg-[#EF4444]/20', text: 'text-[#EF4444]' }} value={payments.baratao} onChange={handlePaymentChange('baratao')} />
            <PaymentCard title="Nota a Prazo" icon={FileText} iconColor={{ bg: 'bg-[#00B4D8]/20', text: 'text-[#00B4D8]' }} value={payments.notaPrazo} onChange={handlePaymentChange('notaPrazo')} />
            <PaymentCard title="Débito" icon={CreditCard} iconColor={{ bg: 'bg-[#3B82F6]/20', text: 'text-[#3B82F6]' }} value={payments.debito} onChange={handlePaymentChange('debito')} />
            <PaymentCard title="Crédito" icon={CreditCard} iconColor={{ bg: 'bg-[#8B5CF6]/20', text: 'text-[#8B5CF6]' }} value={payments.credito} onChange={handlePaymentChange('credito')} />
          </div>
        </div>

        {/* Resumo do Turno */}
        <div className="pt-4 pb-2">
          <div className="bg-[#131722] rounded-[1.75rem] p-6 border border-slate-800/60">
            <div className="flex items-center gap-2 mb-6">
              <History size={18} className="text-slate-400" />
              <h3 className="text-white font-bold">Resumo do Turno</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Encerrante</span>
                <span className="text-[#A78BFA] font-bold text-lg">R$ {totalVendido || '0,00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Pagamentos</span>
                <span className="text-white font-bold text-lg">R$ {conferidoReais().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="border-t border-slate-700/50 border-dashed pt-4">
              {renderDifference()}
            </div>
          </div>
        </div>

        {/* Enviados no dia */}
        <div className="bg-[#131722] rounded-[1.75rem] p-5 border border-slate-800/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-400" />
              <h3 className="text-white font-bold text-sm">
                Enviados em {new Date(dataFechamento + 'T00:00:00').toLocaleDateString('pt-BR')}
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {enviosDoDia.length}
            </span>
          </div>
          <ListaDeEnviosDoDia
            erro={erroEnvios}
            envios={enviosDoDia}
            aoTentarDeNovo={() => setEnviosVersao((v) => v + 1)}
          />
        </div>

        {/* Botão Enviar Registro */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all 
                  ${isSubmitting
                    ? 'bg-indigo-600/50 cursor-not-allowed'
                    : confirmarDataDiferente
                      // Confirmação armada: o botão MUDA, porque o primeiro toque não envia e
                      // só uma frase no aviso amarelo dizia isso — em 19/08/2026 dois envios
                      // ficaram no primeiro toque e o dono achou que tinham ido.
                      ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.35)] animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-[0_0_20px_rgba(79,70,229,0.3)] shadow-indigo-600/20'}`}
        >
          {confirmarDataDiferente && !isSubmitting ? <AlertCircle size={20} /> : <Check size={20} />}
          {isSubmitting
            ? 'Enviando...'
            : confirmarDataDiferente
              ? `Toque de novo: confirmar envio em ${new Date(dataFechamento + 'T00:00:00').toLocaleDateString('pt-BR')}`
              : 'Enviar Registro'}
        </button>
      </div>

      {/* Modal Frentistas Overscreen */}
      {isModalOpen && (
        <ModalDeFrentistas
          frentistas={frentistas}
          selecionado={selectedFrentista}
          aoEscolher={(frentista) => {
            setSelectedFrentista(frentista);
            setIsModalOpen(false);
          }}
          aoFechar={() => setIsModalOpen(false)}
        />
      )}

      {renderBottomNav()}
    </div>
  );
};

export default function App() {
  const [dialog, setDialog] = useState<DialogState>({ isOpen: false, title: '', message: '', type: 'success' });

  return (
    <>
      <AppComponent setDialog={setDialog} />
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setDialog({ ...dialog, isOpen: false })} />
          <div className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center transform transition-transform ${dialog.type === 'success' ? 'bg-[#10141d] border border-emerald-500/30' : 'bg-[#10141d] border border-red-500/30'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${dialog.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'}`}>
              {dialog.type === 'success' ? <Check size={32} /> : <AlertCircle size={32} />}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{dialog.title}</h3>
            <p className="text-slate-300 mb-6 font-medium">{dialog.message}</p>
            <button
              onClick={() => setDialog({ ...dialog, isOpen: false })}
              className={`w-full py-3 rounded-xl font-bold text-white transition-colors outline-none focus:ring-2 ${dialog.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500/50' : 'bg-red-600 hover:bg-red-500 focus:ring-red-500/50'}`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
