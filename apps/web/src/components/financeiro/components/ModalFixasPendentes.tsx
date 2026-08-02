import React, { useState } from 'react';
import { X, Repeat, Loader2, AlertTriangle } from 'lucide-react';
import { formatCurrency, totalSugerido, type FixaPendente } from '@posto/utils';
import { CampoMoeda } from '@shared/ui/campo-moeda';
import { formatarMesBR } from '../../../utils/periodo';
import type { LancamentoFixa } from '../../../services/api/despesa-fixa.service';

interface ModalFixasPendentesProps {
  /** Mês que está sendo lançado, ISO local `aaaa-mm`. */
  mes: string;
  pendentes: readonly FixaPendente[];
  onCancelar: () => void;
  onLancar: (lancamentos: LancamentoFixa[]) => Promise<void>;
}

/** Linha em edição: começa no valor sugerido e o dono ajusta. */
interface LinhaEditavel extends FixaPendente {
  valor: number;
  incluir: boolean;
}

/**
 * Revisão das despesas fixas antes de virarem lançamento do mês.
 *
 * @remarks
 * A revisão é o ponto da tela, não um passo extra. Nos 7 meses de 2026, o valor
 * mudou em quase toda fixa: "Paulo" (salário) teve 3 valores distintos por reajuste
 * e "Luz" teve 6, de R$ 280 a R$ 850. Lançar direto o valor do mês anterior colocaria
 * número errado no cálculo de lucro sem ninguém ver — por isso o valor vem preenchido
 * mas editável, e cada linha mostra **de que mês** veio a sugestão.
 */
export const ModalFixasPendentes: React.FC<ModalFixasPendentesProps> = ({
  mes,
  pendentes,
  onCancelar,
  onLancar,
}) => {
  const [linhas, setLinhas] = useState<LinhaEditavel[]>(() =>
    pendentes.map((p) => ({ ...p, valor: p.valorSugerido, incluir: true }))
  );
  const [salvando, setSalvando] = useState(false);

  const selecionadas = linhas.filter((l) => l.incluir);
  const total = totalSugerido(selecionadas.map((l) => ({ ...l, valorSugerido: l.valor })));

  /** Sugestão de mês anterior ao imediatamente passado: o dono precisa olhar com mais atenção. */
  const mesAnterior = (() => {
    const [ano, m] = mes.split('-').map(Number);
    const d = new Date(ano, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const alterar = (descricao: string, patch: Partial<LinhaEditavel>) =>
    setLinhas((atual) =>
      atual.map((l) => (l.descricao === descricao ? { ...l, ...patch } : l))
    );

  const confirmar = async () => {
    setSalvando(true);
    try {
      await onLancar(
        selecionadas.map((l) => ({
          descricao: l.descricao,
          categoria: l.categoria,
          valor: l.valor,
          categoriaId: l.categoriaId,
        }))
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Despesas fixas de {formatarMesBR(mes)}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Confira os valores antes de lançar — eles vêm do último mês e mudam com frequência.
              </p>
            </div>
          </div>
          <button
            onClick={onCancelar}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-2">
          {linhas.map((l) => {
            const desatualizada = l.referencia < mesAnterior;
            return (
              <div
                key={l.descricao}
                // `dark:bg-gray-700`, NUNCA `gray-750`: a escala do Tailwind pula de
                // 700 para 800 e este app não tem `tailwind.config` que estenda isso
                // (só o PWA tem). Classe inexistente é descartada em silêncio — o
                // `bg-gray-50` sobrevivia e a linha ficava clara dentro do modal escuro.
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  l.incluir
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                    : 'border-dashed border-gray-300 dark:border-gray-600 opacity-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={l.incluir}
                  onChange={(e) => alterar(l.descricao, { incluir: e.target.checked })}
                  className="w-4 h-4 rounded accent-purple-600"
                  aria-label={`Incluir ${l.descricao}`}
                />

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                    {l.descricao}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    {l.categoria ?? 'Sem categoria'}
                    <span aria-hidden>·</span>
                    <span className={desatualizada ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                      {desatualizada && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                      valor de {formatarMesBR(l.referencia)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm text-gray-500">R$</span>
                  <CampoMoeda
                    valor={l.valor}
                    disabled={!l.incluir}
                    placeholder="0,00"
                    onChange={(valor) => alterar(l.descricao, { valor })}
                    className="w-28 px-2 py-1 text-right font-finance rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                    aria-label={`Valor de ${l.descricao}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {selecionadas.length} de {linhas.length} ·{' '}
            </span>
            <strong className="font-finance text-gray-900 dark:text-white">
              {formatCurrency(total)}
            </strong>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancelar}
              disabled={salvando}
              className="px-4 py-2 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={salvando || selecionadas.length === 0}
              className="px-4 py-2 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Lançar {selecionadas.length > 0 ? selecionadas.length : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
