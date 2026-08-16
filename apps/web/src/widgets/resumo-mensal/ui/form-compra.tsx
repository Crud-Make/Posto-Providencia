import React, { useActionState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import type { ReferenciaProduto, Fornecedor, EntradaCompra } from '../model/use-resumo-mensal';

interface FormCompraProps {
  readonly referencias: readonly ReferenciaProduto[];
  readonly fornecedores: readonly Fornecedor[];
  /** Data sugerida — o fim do período exibido. */
  readonly dataPadrao: string;
  readonly onLancar: (entrada: EntradaCompra) => Promise<string | null>;
}

const rotulo = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1';
const campo =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Lançamento de compra de combustível a partir do próprio resumo.
 *
 * @remarks Na planilha, `Compra, LT.` e `Compra, R$.` são células digitadas — é
 *          daí que sai o custo médio e, por consequência, o lucro de cada
 *          produto. Este formulário é o equivalente delas no sistema.
 *
 *          O número vai em `type="number"`, que entrega sempre ponto decimal.
 *          Campo de texto passado pelo `parseValue` leria "5672.500" como
 *          5.672.500 — o ponto seria tratado como separador de milhar, e um erro
 *          de mil vezes em litros de combustível não perdoa.
 */
export const FormCompra: React.FC<FormCompraProps> = ({
  referencias,
  fornecedores,
  dataPadrao,
  onLancar,
}) => {
  const disponiveis = referencias.filter((r) => r.combustivelId !== null);

  const [mensagem, acao, pendente] = useActionState<string | null, FormData>(
    async (_anterior, formData) => {
      const combustivelId = Number(formData.get('combustivel'));
      const fornecedorId = Number(formData.get('fornecedor'));
      const litros = Number(formData.get('litros'));
      const valor = Number(formData.get('valor'));
      const data = String(formData.get('data') ?? '');

      if (!combustivelId) return 'Escolha o produto.';
      if (!fornecedorId) return 'Escolha o fornecedor.';
      if (!data) return 'Informe a data da compra.';

      const erro = await onLancar({ combustivelId, fornecedorId, litros, valor, data });
      return erro ?? 'ok';
    },
    null
  );

  if (disponiveis.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Nenhum combustível cadastrado — não há o que comprar.
      </p>
    );
  }

  // Lista vazia aqui tem DUAS causas possíveis e a tela não consegue distinguir:
  // ou não há fornecedor cadastrado, ou a RLS barrou a leitura — e leitura barrada
  // devolve lista vazia SEM erro. Afirmar "não há nenhum cadastrado" seria mentira
  // metade das vezes, e mentira que manda o dono cadastrar um fornecedor duplicado.
  if (fornecedores.length === 0) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-400">
        A lista de fornecedores veio vazia. Ou não há nenhum cadastrado, ou o painel não tem
        permissão para lê-la — ele acessa o banco como visitante. Sem fornecedor não dá para
        lançar a compra, porque a nota precisa saber de quem veio o combustível.
      </p>
    );
  }

  return (
    <form action={acao} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className={rotulo} htmlFor="compra-produto">
            Produto
          </label>
          <select id="compra-produto" name="combustivel" className={campo} required>
            {disponiveis.map((r) => (
              <option key={r.combustivelId} value={r.combustivelId as number}>
                {r.produto}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={rotulo} htmlFor="compra-fornecedor">
            Fornecedor
          </label>
          <select id="compra-fornecedor" name="fornecedor" className={campo} required>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={rotulo} htmlFor="compra-data">
            Data
          </label>
          <input
            id="compra-data"
            name="data"
            type="date"
            defaultValue={dataPadrao}
            className={campo}
            required
          />
        </div>

        <div>
          <label className={rotulo} htmlFor="compra-litros">
            Litros
          </label>
          <input
            id="compra-litros"
            name="litros"
            type="number"
            step="0.001"
            min="0"
            inputMode="decimal"
            placeholder="31000"
            className={campo}
            required
          />
        </div>

        <div>
          <label className={rotulo} htmlFor="compra-valor">
            Valor total (R$)
          </label>
          <input
            id="compra-valor"
            name="valor"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="165700,00"
            className={campo}
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          {pendente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Lançar compra
        </button>

        {mensagem === 'ok' && !pendente && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Compra lançada — o custo médio e o lucro já foram recalculados.
          </span>
        )}
        {mensagem && mensagem !== 'ok' && !pendente && (
          <span className="text-sm text-red-600 dark:text-red-400">{mensagem}</span>
        )}
      </div>
    </form>
  );
};
