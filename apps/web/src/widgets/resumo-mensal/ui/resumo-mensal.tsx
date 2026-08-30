import React from 'react';
import { corDeSinal } from '@posto/utils';
import { Fuel, ShoppingCart, Gauge, AlertTriangle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@posto/utils';
import { useResumoMensal } from '../model/use-resumo-mensal';

import { FormCompra } from './form-compra';
import { FormMedicao } from './form-medicao';

interface ResumoMensalProps {
  postoId: number | null;
  /** Mês a exibir, ISO local `aaaa-mm`. */
  mesIso: string;
}

const litros = (v: number) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} L`;

const porLitro = (v: number | null) =>
  v === null
    ? '—'
    : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;

const percentual = (v: number | null) =>
  v === null ? '—' : `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const CabecalhoBloco: React.FC<{
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
}> = ({ icone, titulo, descricao }) => (
  <div className="mb-6">
    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
      <span className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-lg">{icone}</span>
      {titulo}
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{descricao}</p>
  </div>
);

const Aviso: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
    <span>{children}</span>
  </div>
);

const Bloco: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
    {children}
  </div>
);

/** Tabela rola sozinha no celular; a página nunca rola na horizontal. */
const Rolagem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto -mx-2 px-2">{children}</div>
);

const th = 'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';
const td = 'px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap';
const tdNum = `${td} text-right font-finance tabular-nums`;
const linhaTotal = 'border-t-2 border-gray-300 dark:border-gray-600 font-semibold';

/**
 * Resumo mensal do posto na quebra da planilha do dono: venda por bico, compra
 * por produto e estoque com perda apurada.
 *
 * @remarks Componente de apresentação puro — todo o cálculo vem de
 *          `@posto/utils` pelo hook `useResumoMensal`, coberto por golden master
 *          contra os 7 meses reais de 2026. Ele não soma, não divide e não
 *          arredonda nada: componente que calcula dinheiro está errado por
 *          definição (CLAUDE.md §3).
 */
export const ResumoMensal: React.FC<ResumoMensalProps> = ({ postoId, mesIso }) => {
  const { dados, carregando, erro, lancarCompra, salvarMedicao } = useResumoMensal(
    postoId,
    mesIso
  );

  if (carregando) {
    return (
      <Bloco>
        <div className="flex items-center justify-center gap-3 py-8 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Apurando o resumo do mês...
        </div>
      </Bloco>
    );
  }

  if (erro) {
    return (
      <Bloco>
        <Aviso>{erro}</Aviso>
      </Bloco>
    );
  }

  if (!dados) {
    return (
      <Bloco>
        <CabecalhoBloco
          icone={<Fuel className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          titulo="Resumo por Produto"
          descricao="Selecione um posto para ver o resumo do mês."
        />
      </Bloco>
    );
  }

  const {
    venda,
    compra,
    estoque,
    produtosSemCusto,
    produtosSemAbertura,
    despesaDoMes,
    referencias,
    fornecedores,
    periodo,
    dataAbertura,
  } = dados;

  // Mês sem leitura ainda mostra os formulários: é exatamente quando compra e
  // medição precisam ser lançadas. Esconder o que falta preencher atrás de um
  // "nada aqui" foi como o mês ficou vazio em primeiro lugar.
  const semVenda = venda.bicos.length === 0;

  // Na planilha, `Produto, Vedindo.` e `Produto,%` só aparecem na linha do
  // PRIMEIRO bico de cada produto — a comum tem três bicos e um total só. Repetir
  // o valor nas três linhas faria quem somasse a coluna chegar ao triplo.
  const primeiroBicoDoProduto = new Map<string, string>();
  for (const b of venda.bicos) {
    if (!primeiroBicoDoProduto.has(b.produto)) primeiroBicoDoProduto.set(b.produto, b.bico);
  }
  const agregadoDaLinha = (bico: string, produto: string) =>
    primeiroBicoDoProduto.get(produto) === bico
      ? venda.produtos.find((p) => p.produto === produto)
      : undefined;

  return (
    <div className="space-y-8">
      {/* ── Bloco 1: venda por bico e por produto ─────────────────────────── */}
      <Bloco>
        <CabecalhoBloco
          icone={<Fuel className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          titulo="Venda por Produto"
          descricao="Quanto cada bico girou no mês, e quanto sobrou depois do custo de compra e da despesa rateada."
        />

        {!venda.temDespesa && (
          <div className="mb-4">
            <Aviso>
              Nenhuma despesa lançada no mês — o lucro abaixo é <strong>bruto</strong>, não o que
              sobrou no bolso.
            </Aviso>
          </div>
        )}

        {produtosSemCusto.length > 0 && (
          <div className="mb-4">
            <Aviso>
              Sem compra lançada no mês para <strong>{produtosSemCusto.join(', ')}</strong> — o
              lucro desses produtos não é apurável e aparece como “—”. O preço de custo do
              cadastro <strong>não</strong> é usado como substituto: ele guarda só o valor de
              hoje, e aplicá-lo a um mês passado inflaria o resultado.
            </Aviso>
          </div>
        )}

        {semVenda ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nenhuma leitura lançada neste mês — a venda entra pelo Fechamento Diário.
          </p>
        ) : (
        <Rolagem>
          <table className="w-full min-w-[1120px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className={`${th} text-left`}>Produtos</th>
                <th className={`${th} text-right`}>Inicial</th>
                <th className={`${th} text-right`}>Fechamento</th>
                <th className={`${th} text-right`}>Litros</th>
                <th className={`${th} text-right`}>Valor LT R$</th>
                <th className={`${th} text-right`}>Valor por bico</th>
                <th className={`${th} text-right`}>Lucro, LT, R$</th>
                <th className={`${th} text-right`}>Lucro, bico, R$</th>
                <th className={`${th} text-right`}>Margem do Produto</th>
                <th className={`${th} text-right`}>Produto, Vendido</th>
                <th className={`${th} text-right`}>Produto, %</th>
              </tr>
            </thead>
            <tbody>
              {venda.bicos.map((b) => (
                <tr
                  key={b.bico}
                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <td className={`${td} font-medium text-gray-900 dark:text-white`}>{b.bico}</td>
                  <td className={tdNum}>{b.inicial === null ? '—' : litros(b.inicial)}</td>
                  <td className={tdNum}>{b.fechamento === null ? '—' : litros(b.fechamento)}</td>
                  <td className={tdNum}>{litros(b.litros)}</td>
                  <td className={tdNum}>{porLitro(b.precoMedio)}</td>
                  <td className={tdNum}>{formatCurrency(b.venda)}</td>
                  <td className={tdNum}>{porLitro(b.lucroLitro)}</td>
                  <td
                    className={`${tdNum} ${
                      b.apurado
                        ? corDeSinal(b.lucro).texto
                        : ''
                    }`}
                  >
                    {b.apurado ? formatCurrency(b.lucro) : '—'}
                  </td>
                  <td className={tdNum}>{b.apurado ? percentual(b.margem) : '—'}</td>
                  {/* `Produto, Vendido` e `Produto, %` são do PRODUTO, não do bico:
                      aparecem só na linha do primeiro bico de cada produto, como na
                      planilha. Repetir em cada bico faria a soma da coluna dar três
                      vezes o volume da gasolina comum. */}
                  <td className={`${tdNum} text-gray-900 dark:text-white`}>
                    {agregadoDaLinha(b.bico, b.produto)
                      ? litros(agregadoDaLinha(b.bico, b.produto)!.litros)
                      : ''}
                  </td>
                  <td className={`${tdNum} text-gray-900 dark:text-white`}>
                    {agregadoDaLinha(b.bico, b.produto)
                      ? percentual(agregadoDaLinha(b.bico, b.produto)!.participacaoLitros)
                      : ''}
                  </td>
                </tr>
              ))}
              <tr className={linhaTotal}>
                <td className={`${td} text-gray-900 dark:text-white`}>Total e Media &rarr;</td>
                <td className={tdNum} />
                <td className={tdNum} />
                <td className={tdNum}>{litros(venda.totais.litros)}</td>
                {/* Média PONDERADA (venda ÷ litros), não média das linhas: média de
                    preço ignora o peso de cada bico e devolve número que não existe. */}
                <td className={tdNum}>{porLitro(venda.totais.precoMedio)}</td>
                <td className={tdNum}>{formatCurrency(venda.totais.venda)}</td>
                <td className={tdNum} />
                <td className={tdNum}>
                  {venda.apurado ? formatCurrency(venda.totais.lucro) : `${formatCurrency(venda.totais.lucro)} *`}
                </td>
                <td className={tdNum}>{percentual(venda.totais.margem)}</td>
                <td className={tdNum}>{litros(venda.totais.litros)}</td>
                <td className={tdNum}>{percentual(100)}</td>
              </tr>
            </tbody>
          </table>
        </Rolagem>
        )}

        {!venda.apurado && !semVenda && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            * Total incompleto: soma apenas os bicos com custo apurável.
          </p>
        )}

        {/* Participação por produto — três bicos vendem a mesma gasolina, e é o
            produto agregado que responde "o que gira aqui". */}
        <div className={semVenda ? 'hidden' : 'mt-8'}>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Participação no volume
          </h4>
          <div className="space-y-2">
            {venda.produtos.map((p) => (
              <div key={p.produto} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-gray-700 dark:text-gray-300 truncate">
                  {p.produto}
                </span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min(p.participacaoLitros, 100)}%` }}
                  />
                </div>
                <span className="w-20 text-right text-sm font-finance tabular-nums text-gray-600 dark:text-gray-400">
                  {percentual(p.participacaoLitros)}
                </span>
                <span className="w-32 text-right text-sm font-finance tabular-nums text-gray-500 dark:text-gray-500">
                  {litros(p.litros)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Bloco>

      {/* ── Bloco 2: compra e custo ────────────────────────────────────────── */}
      <Bloco>
        <CabecalhoBloco
          icone={<ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          titulo="Compra e Custo"
          descricao="Por quanto o litro precisa sair para pagar o que ele custou — compra mais a despesa rateada."
        />

        {compra === null ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Nenhuma compra lançada neste mês — sem ela não há custo médio, e sem custo médio não
            há lucro a apurar.
          </p>
        ) : (
          <>
            <Rolagem>
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className={`${th} text-left`}>Produtos</th>
                    <th className={`${th} text-right`}>Compra, LT.</th>
                    <th className={`${th} text-right`}>Compra, R$</th>
                    <th className={`${th} text-right`}>Media LT R$</th>
                    <th className={`${th} text-right`}>Valor pra Venda</th>
                    <th className={`${th} text-right`}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {compra.produtos.map((p) => (
                    <tr
                      key={p.produto}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className={`${td} font-medium text-gray-900 dark:text-white`}>
                        {p.produto}
                      </td>
                      <td className={tdNum}>{litros(p.litros)}</td>
                      <td className={tdNum}>{formatCurrency(p.valor)}</td>
                      <td className={tdNum}>{porLitro(p.mediaLitro)}</td>
                      <td className={tdNum}>{porLitro(p.valorParaVenda)}</td>
                      <td className={tdNum}>{percentual(p.percentualDespesa)}</td>
                    </tr>
                  ))}
                  <tr className={linhaTotal}>
                    <td className={`${td} text-gray-900 dark:text-white`}>Total e Media &rarr;</td>
                    <td className={tdNum}>{litros(compra.totais.litros)}</td>
                    <td className={tdNum}>{formatCurrency(compra.totais.valor)}</td>
                    <td className={tdNum}>{porLitro(compra.totais.mediaLitro)}</td>
                    <td className={tdNum}>{porLitro(compra.totais.valorParaVenda)}</td>
                    <td className={tdNum}>{percentual(compra.totais.percentualDespesa)}</td>
                  </tr>
                </tbody>
              </table>
            </Rolagem>

            {/* O bloco lateral da planilha: `Desp,Mês.` e `Custo do LT R$`. É a
                origem da corrente inteira — daqui sai o piso de venda de cada
                produto e, por consequência, todo o lucro. */}
            <div className="mt-4 inline-flex flex-wrap gap-8 rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Desp, Mês:{' '}
                <strong className="font-finance text-gray-900 dark:text-white">
                  {formatCurrency(despesaDoMes)}
                </strong>
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Custo do LT R$:{' '}
                <strong className="font-finance text-gray-900 dark:text-white">
                  {porLitro(compra.despesaPorLitro)}
                </strong>
              </span>
            </div>

            <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
              O piso de venda cobre compra + despesa e para aí — vender nele dá lucro zero. O
              preço de bomba é decisão sua.
            </p>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Lançar compra
          </h4>
          <FormCompra
            referencias={referencias}
            fornecedores={fornecedores}
            dataPadrao={periodo.fim.slice(0, 10)}
            onLancar={lancarCompra}
          />
        </div>
      </Bloco>

      {/* ── Bloco 3: estoque e perda ───────────────────────────────────────── */}
      <Bloco>
        <CabecalhoBloco
          icone={<Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          titulo="Estoque e Perda"
          descricao="O que deveria haver no tanque contra o que a régua mediu. Negativo = combustível faltando."
        />

        {produtosSemAbertura.length > 0 && (
          <div className="mb-4">
            <Aviso>
              Sem medição de tanque na abertura do período para{' '}
              <strong>{produtosSemAbertura.join(', ')}</strong> — sem ela não há estoque teórico,
              e sem estoque teórico não há perda a apurar. Esses produtos ficam fora da tabela.
            </Aviso>
          </div>
        )}

        {estoque === null ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sem medição de tanque no período — nada a apurar.
          </p>
        ) : (
          <Rolagem>
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className={`${th} text-left`}>Produtos</th>
                  <th className={`${th} text-right`}>Ano passado.</th>
                  <th className={`${th} text-right`}>Compra e Estoque.</th>
                  <th className={`${th} text-right`}>Estoque Hoje</th>
                  <th className={`${th} text-right`}>Perca e Sobra</th>
                  <th className={`${th} text-right`}>Estoque Tanque.</th>
                </tr>
              </thead>
              <tbody>
                {estoque.produtos.map((p) => (
                  <tr
                    key={p.produto}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className={`${td} font-medium text-gray-900 dark:text-white`}>
                      {p.produto}
                    </td>
                    <td className={tdNum}>{litros(p.estoqueAnterior)}</td>
                    <td className={tdNum}>{litros(p.compraEEstoque)}</td>
                    <td className={tdNum}>{litros(p.estoqueTeorico)}</td>
                    <td
                      className={`${tdNum} ${
                        p.percaOuSobra === null
                          ? ''
                          : `${corDeSinal(p.percaOuSobra).texto} font-semibold`
                      }`}
                    >
                      {p.percaOuSobra === null ? '—' : litros(p.percaOuSobra)}
                    </td>
                    <td className={tdNum}>
                      {p.estoqueMedido === null ? '—' : litros(p.estoqueMedido)}
                    </td>
                  </tr>
                ))}
                <tr className={linhaTotal}>
                  <td className={`${td} text-gray-900 dark:text-white`}>Total e Media →</td>
                  <td className={tdNum}>{litros(estoque.totais.estoqueAnterior)}</td>
                  <td className={tdNum}>{litros(estoque.totais.compraEEstoque)}</td>
                  <td className={tdNum}>{litros(estoque.totais.estoqueTeorico)}</td>
                  <td
                    className={`${tdNum} ${
                      estoque.totais.percaOuSobra !== null
                        ? corDeSinal(estoque.totais.percaOuSobra).texto
                        : ''
                    }`}
                  >
                    {estoque.totais.percaOuSobra === null
                      ? '—'
                      : litros(estoque.totais.percaOuSobra)}
                  </td>
                  <td className={tdNum}>
                    {estoque.totais.estoqueMedido === null
                      ? '—'
                      : litros(estoque.totais.estoqueMedido)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Rolagem>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Registrar medição do tanque
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            É a régua — o único número desta tela que não sai de cálculo nenhum. A{' '}
            <strong>abertura</strong> é o que sobrou no fecho do período anterior; o{' '}
            <strong>fechamento</strong> é o que o tanque tem agora.
          </p>
          <FormMedicao
            referencias={referencias}
            dataAbertura={dataAbertura}
            dataFechamento={periodo.fim.slice(0, 10)}
            onSalvar={salvarMedicao}
          />
        </div>
      </Bloco>
    </div>
  );
};
