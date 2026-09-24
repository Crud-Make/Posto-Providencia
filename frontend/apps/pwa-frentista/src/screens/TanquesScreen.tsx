/**
 * Tela de medição de régua dos tanques (Issue #74).
 *
 * O frentista mede a régua, digita os litros de cada tanque e envia — a
 * medição cai em `HistoricoTanque` e alimenta na hora o estoque derivado e o
 * impacto de troca de preço do painel. Medição é do TANQUE, não do frentista
 * (a tabela não tem coluna de frentista), então a tela não exige seleção.
 *
 * Reenvio do mesmo dia SUBSTITUI (upsert por tanque+dia) — a tela avisa
 * quando já existe medição no dia. RLS: escrita anônima só dentro da janela
 * (migration 20260903), com a conferência anti-RLS-silenciosa na API.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, Droplets, Loader2 } from 'lucide-react';
import { POSTO_ID } from '@frentista/shared/config';
import { corDoProduto, hojeIso } from '@posto/utils';
import { api } from '../services/api';

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;

interface TanqueDaTela {
  readonly id: number;
  readonly combustivel: { nome: string; codigo: string | null } | null;
}

interface Feedback {
  readonly tipo: 'sucesso' | 'erro';
  readonly mensagem: string;
}

/** Só dígitos, no máximo 6 — régua é litro inteiro; 999.999 L cobre qualquer tanque. */
const mascaraLitros = (bruto: string) => bruto.replace(/\D/g, '').slice(0, 6);

const TanquesScreen = ({ onVoltar }: { onVoltar: () => void }) => {
  const [tanques, setTanques] = useState<TanqueDaTela[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [data, setData] = useState(hojeIso());
  const [medidoNoDia, setMedidoNoDia] = useState<Map<number, number>>(new Map());
  const [valores, setValores] = useState<Record<number, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    api.getTanques(POSTO_ID)
      .then((t) => { setTanques(t); setErroCarga(null); })
      .catch((e: unknown) => setErroCarga(e instanceof Error ? e.message : 'Falha ao carregar os tanques.'))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    let ativo = true;
    api.getMedicoesDoDia(data)
      .then((rows) => {
        if (!ativo) return;
        const mapa = new Map<number, number>();
        for (const r of rows) {
          if (r.tanque_id != null && r.volume_fisico != null) mapa.set(r.tanque_id, Number(r.volume_fisico));
        }
        setMedidoNoDia(mapa);
      })
      .catch(() => { if (ativo) setMedidoNoDia(new Map()); });
    return () => { ativo = false; };
  }, [data, versao]);

  const preenchidos = useMemo(
    () => tanques.filter((t) => (valores[t.id] ?? '') !== ''),
    [tanques, valores],
  );

  const enviar = async () => {
    if (preenchidos.length === 0 || enviando) return;
    setEnviando(true);
    setFeedback(null);
    const falhas: string[] = [];
    let gravadas = 0;
    for (const t of preenchidos) {
      const litros = parseInt(valores[t.id], 10);
      try {
        await api.salvarMedicaoTanque(t.id, data, litros);
        gravadas += 1;
      } catch (e) {
        falhas.push(`${t.combustivel?.nome ?? `Tanque ${t.id}`}: ${e instanceof Error ? e.message : 'erro'}`);
      }
    }
    setVersao((v) => v + 1);
    if (falhas.length === 0) {
      setValores({});
      setFeedback({ tipo: 'sucesso', mensagem: `${gravadas} ${gravadas === 1 ? 'medição gravada' : 'medições gravadas'} em ${new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')}. Já aparece no painel.` });
    } else {
      setFeedback({
        tipo: 'erro',
        mensagem: `${gravadas} gravada(s); falhou: ${falhas.join(' · ')}`,
      });
    }
    setEnviando(false);
  };

  const [anoStr, mesStr, diaStr] = data.split('-');
  const ano = Number(anoStr), mes = Number(mesStr), diaNum = Number(diaStr);
  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: anoAtual - 2025 + 1 }, (_, i) => 2025 + i);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const mudarData = (a: number, m: number, d: number) => {
    const maxDia = new Date(a, m, 0).getDate();
    setData(`${a}-${pad(m)}-${pad(Math.min(d, maxDia))}`);
  };
  const clsSelect = 'flex-1 min-w-0 bg-[#1C2230] text-white font-bold text-sm rounded-lg px-2 py-2 border border-slate-700/60 outline-none';

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0D14] text-slate-100 font-sans pb-24">
      <div className="p-5 flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onVoltar} aria-label="Voltar" className="w-10 h-10 rounded-full bg-[#131722] border border-slate-800/60 flex items-center justify-center">
            <ArrowLeft size={18} className="text-slate-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Medição dos tanques</h1>
            <p className="text-xs text-slate-400">Régua física, em litros — cai direto no painel</p>
          </div>
        </div>

        {/* Data da medição — mesmos selects diretos do Registro (calendário nativo rola devagar) */}
        <div className="bg-[#131722] rounded-3xl p-4 border border-slate-800/60 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Data da medição</p>
          <div className="flex items-center gap-2 w-full">
            <select aria-label="Dia" className={clsSelect} value={diaNum} onChange={(e) => mudarData(ano, mes, Number(e.target.value))}>
              {Array.from({ length: diasNoMes }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{pad(d)}</option>)}
            </select>
            <select aria-label="Mês" className={clsSelect} value={mes} onChange={(e) => mudarData(ano, Number(e.target.value), diaNum)}>
              {MESES_CURTOS.map((nome, i) => <option key={nome} value={i + 1}>{nome}</option>)}
            </select>
            <select aria-label="Ano" className={clsSelect} value={ano} onChange={(e) => mudarData(Number(e.target.value), mes, diaNum)}>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {data !== hojeIso() && (
            <p className="text-amber-300 text-xs font-semibold flex items-center gap-1.5 mt-1">
              <AlertCircle size={14} className="shrink-0" /> Esta medição NÃO é de hoje — confira a data.
            </p>
          )}
        </div>

        {carregando && (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Carregando tanques...
          </div>
        )}
        {erroCarga && <p className="text-red-400 text-sm">{erroCarga}</p>}

        {tanques.map((t) => {
          const cor = corDoProduto(t.combustivel?.codigo);
          const jaMedido = medidoNoDia.get(t.id);
          return (
            <div key={t.id} className="bg-[#131722] rounded-2xl p-4 border border-slate-800/60 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <span className="rounded-md px-2 py-0.5 text-xs font-extrabold" style={{ backgroundColor: cor.fundo, color: cor.texto }}>
                    {t.combustivel?.codigo ?? '—'}
                  </span>
                  <span className="font-bold text-white">{t.combustivel?.nome ?? `Tanque ${t.id}`}</span>
                </span>
                <Droplets size={16} className="text-slate-500" />
              </div>
              {jaMedido != null && (
                <p className="text-[11px] text-amber-300/90">
                  Já tem medição neste dia: <strong>{jaMedido.toLocaleString('pt-BR')} L</strong> — enviar de novo substitui.
                </p>
              )}
              <div className="flex items-end gap-2 border-b border-slate-700/50 pb-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={valores[t.id] ?? ''}
                  onChange={(e) => setValores((v) => ({ ...v, [t.id]: mascaraLitros(e.target.value) }))}
                  className="bg-transparent text-white text-xl font-semibold w-full outline-none focus:ring-0"
                  placeholder="0"
                  aria-label={`Litros medidos no tanque de ${t.combustivel?.nome ?? t.id}`}
                />
                <span className="text-slate-400 font-medium text-sm mb-0.5">L</span>
              </div>
            </div>
          );
        })}

        {feedback && (
          <div className={`rounded-2xl p-4 border text-sm font-semibold flex items-start gap-2 ${feedback.tipo === 'sucesso'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
            {feedback.tipo === 'sucesso' ? <Check size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
            <span>{feedback.mensagem}</span>
          </div>
        )}

        <button
          onClick={enviar}
          disabled={enviando || preenchidos.length === 0}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all ${
            enviando || preenchidos.length === 0
              ? 'bg-cyan-700/40 cursor-not-allowed text-slate-300'
              : 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 shadow-[0_0_20px_rgba(8,145,178,0.3)]'
          }`}
        >
          {enviando ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
          {enviando
            ? 'Enviando...'
            : preenchidos.length === 0
              ? 'Digite ao menos uma medição'
              : `Enviar ${preenchidos.length} ${preenchidos.length === 1 ? 'medição' : 'medições'}`}
        </button>
      </div>
    </div>
  );
};

export default TanquesScreen;
