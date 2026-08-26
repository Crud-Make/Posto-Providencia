import React, { useState } from 'react';
import { X, CreditCard, Loader2, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@posto/utils';
import { CampoMoeda } from '@shared/ui/campo-moeda';
import { formatarMesBR } from '../../../utils/periodo';
import type { LancamentoFixa } from '../../../services/api/despesa-fixa.service';

/** Categoria fixa das taxas — a mesma que a carga histórica gravou em `Despesa.categoria`. */
export const CATEGORIA_TAXAS_CARTAO = 'Taxas Cartão';

/** Prefixo da descrição; o provedor vai depois do travessão (`Taxas de cartão — Sicoob`). */
const PREFIXO_DESCRICAO = 'Taxas de cartão — ';

/**
 * Extrai o provedor de uma descrição gravada por este modal.
 *
 * @returns O nome do provedor, ou `null` se a descrição não veio daqui
 *          (ex.: a linha histórica `"Despeza com das taxas dos Cartao."`).
 */
export function provedorDaDescricao(descricao: string): string | null {
  return descricao.startsWith(PREFIXO_DESCRICAO)
    ? descricao.slice(PREFIXO_DESCRICAO.length).trim() || null
    : null;
}

interface LinhaProvedor {
  readonly id: number;
  readonly provedor: string;
  readonly valor: number;
}

interface ModalTaxasCartaoProps {
  /** Mês em que as taxas serão lançadas, `aaaa-mm`. */
  mes: string;
  /** Provedores usados no mês anterior — viram linhas pré-abertas, com valor em branco. */
  provedoresSugeridos: readonly string[];
  onCancelar: () => void;
  onLancar: (lancamentos: LancamentoFixa[]) => Promise<void>;
}

/**
 * Lançamento das taxas de cartão do mês, uma linha por provedor (Sipag, Sicoob…).
 *
 * @remarks
 * Segue a planilha: a taxa é **uma despesa digitada** com o valor da fatura da
 * adquirente — não se calcula de `recebimento × %`. O que este modal acrescenta
 * à grade de despesas é só a dimensão do provedor, porque ele muda ao longo do
 * ano e a fatura vem separada por maquininha. Cada linha vira uma `Despesa` com
 * categoria {@link CATEGORIA_TAXAS_CARTAO}, e a tela de Compras e a Planilha do
 * Mês a rateiam por litro como qualquer outra despesa.
 *
 * O valor **nunca** vem sugerido: o do mês passado não diz nada sobre este mês.
 * Só o nome do provedor é lembrado.
 */
export const ModalTaxasCartao: React.FC<ModalTaxasCartaoProps> = ({
  mes,
  provedoresSugeridos,
  onCancelar,
  onLancar,
}) => {
  const [linhas, setLinhas] = useState<LinhaProvedor[]>(() => {
    const base = provedoresSugeridos.length > 0 ? provedoresSugeridos : [''];
    return base.map((provedor, i) => ({ id: i, provedor, valor: 0 }));
  });
  const [salvando, setSalvando] = useState(false);

  const validas = linhas.filter((l) => l.provedor.trim() !== '' && l.valor > 0);
  const total = validas.reduce((acc, l) => acc + l.valor, 0);

  const alterar = (id: number, patch: Partial<LinhaProvedor>) =>
    setLinhas((atual) => atual.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const adicionar = () =>
    setLinhas((atual) => [...atual, { id: (atual.at(-1)?.id ?? -1) + 1, provedor: '', valor: 0 }]);

  const remover = (id: number) => setLinhas((atual) => atual.filter((l) => l.id !== id));

  const confirmar = async () => {
    setSalvando(true);
    try {
      await onLancar(
        validas.map((l) => ({
          descricao: `${PREFIXO_DESCRICAO}${l.provedor.trim()}`,
          categoria: CATEGORIA_TAXAS_CARTAO,
          valor: l.valor,
        }))
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-xl text-sky-600 dark:text-sky-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Taxas de cartão de {formatarMesBR(mes)}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Uma linha por provedor, com o valor da fatura da maquininha. Entra na despesa do mês.
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
          {linhas.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
            >
              <input
                type="text"
                value={l.provedor}
                onChange={(e) => alterar(l.id, { provedor: e.target.value })}
                placeholder="Provedor (Sipag, Sicoob…)"
                list="provedores-taxa-cartao"
                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-medium"
                aria-label="Provedor da maquininha"
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm text-gray-500">R$</span>
                <CampoMoeda
                  valor={l.valor}
                  placeholder="0,00"
                  onChange={(valor) => alterar(l.id, { valor })}
                  className="w-28 px-2 py-1 text-right font-finance rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  aria-label={`Taxa de ${l.provedor || 'provedor'}`}
                />
              </div>
              <button
                type="button"
                onClick={() => remover(l.id)}
                disabled={linhas.length === 1}
                className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 rounded-lg"
                aria-label="Remover linha"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <datalist id="provedores-taxa-cartao">
            {provedoresSugeridos.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>

          <button
            type="button"
            onClick={adicionar}
            className="flex items-center gap-1 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline px-1 py-1"
          >
            <Plus className="w-4 h-4" /> Outro provedor
          </button>
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">{validas.length} provedor(es) · </span>
            <strong className="font-finance text-gray-900 dark:text-white">{formatCurrency(total)}</strong>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancelar}
              disabled={salvando}
              className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={salvando || validas.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Lançar taxas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
