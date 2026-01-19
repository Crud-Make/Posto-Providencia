import * as React from 'react';
import { RefreshCcw, Save, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import { fechamentoFrentistaService } from '../../../services/api';
import type { SessaoFrentista } from '../../../types/fechamento';
import type { Frentista } from '../../../types/database/index';
import { isSuccess } from '../../../types/ui/response-types';
import { formatarValorAoSair, formatarValorSimples, parseBRFloat, paraReais } from '../../../utils/formatters';

interface EnviosMobileProps {
  sessoes: SessaoFrentista[];
  frentistas: Frentista[];
  onRefresh?: () => void;
  loading?: boolean;
}

type DraftSessao = Pick<
  SessaoFrentista,
  | 'valor_dinheiro'
  | 'valor_pix'
  | 'valor_cartao_debito'
  | 'valor_cartao_credito'
  | 'valor_nota'
  | 'valor_baratao'
>;

const toDraft = (s: SessaoFrentista): DraftSessao => ({
  valor_dinheiro: s.valor_dinheiro,
  valor_pix: s.valor_pix,
  valor_cartao_debito: s.valor_cartao_debito,
  valor_cartao_credito: s.valor_cartao_credito,
  valor_nota: s.valor_nota,
  valor_baratao: s.valor_baratao
});

const parseIdFromTempId = (tempId: string): number | null => {
  const match = /^existing-(\d+)$/.exec(tempId);
  if (!match) return null;
  return Number(match[1]);
};

export const EnviosMobile: React.FC<EnviosMobileProps> = ({ sessoes, frentistas, onRefresh, loading }) => {
  const { user } = useAuth();
  const podeEditar = user?.role === 'ADMIN' || user?.role === 'GERENTE';

  const sessoesComFrentista = React.useMemo(() => sessoes.filter(s => s.frentistaId), [sessoes]);
  const [drafts, setDrafts] = React.useState<Record<string, DraftSessao>>({});
  const [savingId, setSavingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    const next: Record<string, DraftSessao> = {};
    for (const s of sessoesComFrentista) next[s.tempId] = toDraft(s);
    setDrafts(next);
  }, [sessoesComFrentista]);

  const updateDraft = React.useCallback(
    (tempId: string, field: keyof DraftSessao, value: string) => {
      setDrafts(prev => ({
        ...prev,
        [tempId]: {
          ...(prev[tempId] || toDraft(sessoesComFrentista.find(s => s.tempId === tempId) as SessaoFrentista)),
          [field]: value
        }
      }));
    },
    [sessoesComFrentista]
  );

  const formatOnBlur = React.useCallback(
    (tempId: string, field: keyof DraftSessao) => {
      setDrafts(prev => {
        const current = prev[tempId];
        if (!current) return prev;
        return {
          ...prev,
          [tempId]: {
            ...current,
            [field]: formatarValorAoSair(current[field])
          }
        };
      });
    },
    []
  );

  const salvarSessao = React.useCallback(
    async (sessao: SessaoFrentista) => {
      const id = parseIdFromTempId(sessao.tempId);
      if (!id) return;

      const draft = drafts[sessao.tempId];
      if (!draft) return;

      const dinheiro = parseBRFloat(draft.valor_dinheiro);
      const pix = parseBRFloat(draft.valor_pix);
      const debito = parseBRFloat(draft.valor_cartao_debito);
      const credito = parseBRFloat(draft.valor_cartao_credito);
      const nota = parseBRFloat(draft.valor_nota);
      const baratao = parseBRFloat(draft.valor_baratao);

      const totalCartao = debito + credito;
      const totalInformado = dinheiro + pix + totalCartao + nota + baratao;
      const encerrante = parseBRFloat(sessao.valor_encerrante);
      const diferencaCalculada = encerrante > 0 ? encerrante - totalInformado : 0;

      setSavingId(id);
      const res = await fechamentoFrentistaService.update(id, {
        valor_dinheiro: dinheiro,
        valor_pix: pix,
        valor_nota: nota,
        baratao,
        valor_cartao: totalCartao,
        valor_conferido: totalInformado,
        diferenca_calculada: diferencaCalculada,
        valor_cartao_debito: debito,
        valor_cartao_credito: credito
      } as any);
      setSavingId(null);

      if (!isSuccess(res)) {
        toast.error(res.error || 'Erro ao salvar ajustes');
        return;
      }

      toast.success('Ajustes salvos');
      onRefresh?.();
    },
    [drafts, onRefresh]
  );

  return (
    <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Smartphone size={18} className="text-blue-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Envios do App (Frentistas)</h3>
            <p className="text-xs text-slate-400">Aparece automaticamente quando o frentista envia pelo mobile</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
            {sessoesComFrentista.length} recebidos
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-700/60 bg-slate-900/40 hover:bg-slate-900/70 transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCcw size={16} className="text-slate-300" />
            </button>
          )}
        </div>
      </div>

      {sessoesComFrentista.length === 0 ? (
        <div className="p-8 text-center text-slate-400">Nenhum envio do mobile para esta data/turno.</div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Frentista</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Enviado em</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Dinheiro</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">PIX</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Cartão Débito</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Cartão Crédito</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Nota/Vale</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Baratão</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700/50">
              {sessoesComFrentista.map((s) => {
                const nome = frentistas.find(f => f.id === s.frentistaId)?.nome || 'Frentista';
                const enviadoEm = s.data_hora_envio ? new Date(s.data_hora_envio).toLocaleString('pt-BR') : '-';
                const draft = drafts[s.tempId] || toDraft(s);
                const dinheiro = parseBRFloat(draft.valor_dinheiro);
                const pix = parseBRFloat(draft.valor_pix);
                const debito = parseBRFloat(draft.valor_cartao_debito);
                const credito = parseBRFloat(draft.valor_cartao_credito);
                const nota = parseBRFloat(draft.valor_nota);
                const baratao = parseBRFloat(draft.valor_baratao);
                const total = dinheiro + pix + debito + credito + nota + baratao;
                const id = parseIdFromTempId(s.tempId);

                const inputClass = "block w-[130px] bg-slate-900 border border-slate-700 rounded-lg shadow-sm sm:text-sm px-3 py-2 text-slate-100 font-mono text-right disabled:opacity-60";

                return (
                  <tr key={s.tempId} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">{nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">{enviadoEm}</td>

                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className={inputClass}
                        value={draft.valor_dinheiro}
                        onChange={(e) => updateDraft(s.tempId, 'valor_dinheiro', formatarValorSimples(e.target.value))}
                        onBlur={() => formatOnBlur(s.tempId, 'valor_dinheiro')}
                        disabled={!podeEditar || loading}
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className={inputClass}
                        value={draft.valor_pix}
                        onChange={(e) => updateDraft(s.tempId, 'valor_pix', formatarValorSimples(e.target.value))}
                        onBlur={() => formatOnBlur(s.tempId, 'valor_pix')}
                        disabled={!podeEditar || loading}
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className={inputClass}
                        value={draft.valor_cartao_debito}
                        onChange={(e) => updateDraft(s.tempId, 'valor_cartao_debito', formatarValorSimples(e.target.value))}
                        onBlur={() => formatOnBlur(s.tempId, 'valor_cartao_debito')}
                        disabled={!podeEditar || loading}
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className={inputClass}
                        value={draft.valor_cartao_credito}
                        onChange={(e) => updateDraft(s.tempId, 'valor_cartao_credito', formatarValorSimples(e.target.value))}
                        onBlur={() => formatOnBlur(s.tempId, 'valor_cartao_credito')}
                        disabled={!podeEditar || loading}
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className={inputClass}
                        value={draft.valor_nota}
                        onChange={(e) => updateDraft(s.tempId, 'valor_nota', formatarValorSimples(e.target.value))}
                        onBlur={() => formatOnBlur(s.tempId, 'valor_nota')}
                        disabled={!podeEditar || loading}
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className={inputClass}
                        value={draft.valor_baratao}
                        onChange={(e) => updateDraft(s.tempId, 'valor_baratao', formatarValorSimples(e.target.value))}
                        onBlur={() => formatOnBlur(s.tempId, 'valor_baratao')}
                        disabled={!podeEditar || loading}
                        placeholder="R$ 0,00"
                      />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-100 font-mono font-bold">{paraReais(total)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => salvarSessao(s)}
                        disabled={!podeEditar || loading || !id || savingId === id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium transition-colors disabled:opacity-50"
                        title={!podeEditar ? 'Apenas gerente/admin pode editar' : 'Salvar ajustes'}
                      >
                        <Save size={16} />
                        Salvar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
