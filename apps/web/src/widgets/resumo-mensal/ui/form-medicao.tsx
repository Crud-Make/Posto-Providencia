import React, { useActionState } from 'react';
import { Ruler, Loader2 } from 'lucide-react';
import type { ReferenciaProduto, EntradaMedicao } from '../model/use-resumo-mensal';

interface FormMedicaoProps {
  readonly referencias: readonly ReferenciaProduto[];
  /** Dia anterior ao início do período — a abertura, o `Ano passado.` da planilha. */
  readonly dataAbertura: string;
  /** Fim do período exibido — o `Estoque Tanque.` que revela a perda. */
  readonly dataFechamento: string;
  readonly onSalvar: (entrada: EntradaMedicao) => Promise<string | null>;
}

const rotulo = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1';
const campo =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Registro da medição física do tanque — a régua.
 *
 * @remarks É o único número deste painel que **não** sai de cálculo nenhum:
 *          alguém mede o tanque e digita. Sem ele não há perda apurável, e é por
 *          isso que a tabela de estoque mostra "—" em vez de zero quando falta.
 *
 *          São duas datas, e a diferença entre elas importa. A **abertura** é o
 *          dia anterior ao início do período: o estoque com que o mês começa é o
 *          que sobrou no fecho do mês passado. O **fechamento** é o fim do
 *          período. Gravar as duas na mesma data sobrescreveria uma com a outra
 *          — o service faz upsert por tanque + data.
 */
export const FormMedicao: React.FC<FormMedicaoProps> = ({
  referencias,
  dataAbertura,
  dataFechamento,
  onSalvar,
}) => {
  const comTanque = referencias.filter((r) => r.tanqueId !== null);

  const [mensagem, acao, pendente] = useActionState<string | null, FormData>(
    async (_anterior, formData) => {
      const tanqueId = Number(formData.get('tanque'));
      const momento = String(formData.get('momento') ?? '');
      const volumeFisico = Number(formData.get('volume'));

      if (!tanqueId) return 'Escolha o produto.';
      if (momento !== 'abertura' && momento !== 'fechamento') return 'Escolha o momento.';
      if (!Number.isFinite(volumeFisico)) return 'Informe o volume medido.';

      const erro = await onSalvar({
        tanqueId,
        data: momento === 'abertura' ? dataAbertura : dataFechamento,
        volumeFisico,
      });
      return erro ?? 'ok';
    },
    null
  );

  if (comTanque.length === 0) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-400">
        Nenhum tanque cadastrado com produto — sem tanque não há o que medir, e a perda fica sem
        como ser apurada.
      </p>
    );
  }

  return (
    <form action={acao} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className={rotulo} htmlFor="medicao-produto">
            Produto
          </label>
          <select id="medicao-produto" name="tanque" className={campo} required>
            {comTanque.map((r) => (
              <option key={r.tanqueId} value={r.tanqueId as number}>
                {r.produto}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={rotulo} htmlFor="medicao-momento">
            Momento
          </label>
          <select id="medicao-momento" name="momento" className={campo} defaultValue="fechamento">
            <option value="abertura">Abertura ({dataAbertura.split('-').reverse().join('/')})</option>
            <option value="fechamento">
              Fechamento ({dataFechamento.slice(0, 10).split('-').reverse().join('/')})
            </option>
          </select>
        </div>

        <div>
          <label className={rotulo} htmlFor="medicao-volume">
            Volume medido (L)
          </label>
          <input
            id="medicao-volume"
            name="volume"
            type="number"
            step="0.001"
            min="0"
            inputMode="decimal"
            placeholder="5672"
            className={campo}
            required
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={pendente}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            {pendente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ruler className="w-4 h-4" />}
            Salvar medição
          </button>
        </div>
      </div>

      {mensagem === 'ok' && !pendente && (
        <span className="text-sm text-emerald-600 dark:text-emerald-400">
          Medição salva — a perda foi reapurada.
        </span>
      )}
      {mensagem && mensagem !== 'ok' && !pendente && (
        <span className="text-sm text-red-600 dark:text-red-400">{mensagem}</span>
      )}
    </form>
  );
};
