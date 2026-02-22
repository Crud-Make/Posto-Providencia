import * as React from 'react';
import { RefreshCcw, Smartphone, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import type { SessaoFrentista } from '../../../types/fechamento';
import type { Frentista } from '../../../types/database/index';
import { paraReais, parseValue } from '../../../utils/formatters';

interface EnviosMobileProps {
  sessoes: SessaoFrentista[];
  frentistas: Frentista[];
  onRefresh?: () => void;
  loading?: boolean;
  onUpdateCampo?: (tempId: string, campo: keyof SessaoFrentista, valor: string) => void;
  onBlurCampo?: (tempId: string, campo: keyof SessaoFrentista, valor: string) => void;
  onRemoverSessao?: (tempId: string) => void;
}

export const EnviosMobile: React.FC<EnviosMobileProps> = ({
  sessoes,
  frentistas,
  onRefresh,
  loading,
  onUpdateCampo,
  onBlurCampo,
  onRemoverSessao
}) => {
  const sessoesComFrentista = React.useMemo(() => sessoes.filter(s => s.frentistaId), [sessoes]);

  return (
    <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Smartphone size={18} className="text-blue-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Envios do App (Frentistas)</h3>
            <p className="text-xs text-slate-400">Dados sincronizados automaticamente do aplicativo mobile</p>
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
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Débito</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Crédito</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Nota/Vale</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Baratão</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Total</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider w-10">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700/50">
              {sessoesComFrentista.map((s) => {
                const nome = frentistas.find(f => f.id === s.frentistaId)?.nome || 'Frentista';
                const enviadoEm = s.data_hora_envio ? new Date(s.data_hora_envio).toLocaleString('pt-BR') : '-';

                const dinheiro = parseValue(s.valor_dinheiro);
                const pix = parseValue(s.valor_pix);
                const debito = parseValue(s.valor_cartao_debito);
                const credito = parseValue(s.valor_cartao_credito);
                const nota = parseValue(s.valor_nota);
                const baratao = parseValue(s.valor_baratao);
                const total = dinheiro + pix + debito + credito + nota + baratao;

                return (
                  <tr key={s.tempId} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">{nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">{enviadoEm}</td>

                    {[
                      { campo: 'valor_dinheiro', val: s.valor_dinheiro },
                      { campo: 'valor_pix', val: s.valor_pix },
                      { campo: 'valor_cartao_debito', val: s.valor_cartao_debito },
                      { campo: 'valor_cartao_credito', val: s.valor_cartao_credito },
                      { campo: 'valor_nota', val: s.valor_nota },
                      { campo: 'valor_baratao', val: s.valor_baratao },
                    ].map((col) => (
                      <td key={col.campo} className="px-2 py-3 text-right">
                        <div className="relative flex items-center">
                          <span className="absolute left-2 text-slate-500/70 font-mono text-sm pointer-events-none select-none">R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={col.val}
                            onChange={(e) => onUpdateCampo?.(s.tempId, col.campo as keyof SessaoFrentista, e.target.value)}
                            onBlur={(e) => onBlurCampo?.(s.tempId, col.campo as keyof SessaoFrentista, e.target.value)}
                            disabled={loading}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded py-2 pr-2 pl-8 text-right text-slate-200 font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-colors hover:bg-slate-700/50"
                          />
                        </div>
                      </td>
                    ))}

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-emerald-400 font-mono font-bold">{paraReais(total)}</td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja remover este envio?')) {
                            onRemoverSessao?.(s.tempId);
                          }
                        }}
                        disabled={loading}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Excluir Envio"
                      >
                        <Trash2 size={18} />
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
