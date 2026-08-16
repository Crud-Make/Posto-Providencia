import React from 'react';
import { formatBR, formatCurrency } from '@posto/utils';
import type { PlanilhaMensal } from '@posto/utils';
import type { ProdutoDoBanco } from '../model/use-planilha-do-banco';

interface TabelaCompraProps {
    readonly produtos: readonly ProdutoDoBanco[];
    readonly compra: PlanilhaMensal['compra'];
}

const COLUNAS = 6;

const percentual = (v: number) => `${formatBR(v, 2)}%`;
const porLitro = (v: number | null) => (v === null ? '—' : formatCurrency(v));

/**
 * O bloco `Compra`: quanto entrou de combustível e por quanto ele precisa sair.
 *
 * @remarks **Leitura.** `Compra, LT` e `Compra, R$` são a soma das notas do mês
 *          na tabela `Compra`. Não são editáveis aqui porque um total mensal
 *          digitado não sabe a qual nota pertence — perderia fornecedor, data e
 *          o rastro de cada entrega. Quem lança é a tela de **Compras**.
 *
 *          ⚠️ `Valor p/ venda` é **piso, não preço sugerido**: cobre a compra e o
 *          rateio da despesa e para exatamente aí. Vender nele dá lucro zero. O
 *          preço de bomba é decisão do dono.
 */
export const TabelaCompra: React.FC<TabelaCompraProps> = ({ produtos, compra }) => (
    <div className="pm-rolagem">
        <table className="pm-tabela pm-tabela--compra">
            <thead>
                <tr>
                    <th>Produto</th>
                    <th>Compra, LT</th>
                    <th>Compra, R$</th>
                    <th>Média LT</th>
                    <th>Valor p/ venda</th>
                    <th>%</th>
                </tr>
            </thead>
            <tbody>
                {produtos.length === 0 && (
                    <tr className="pm-vazio">
                        <td colSpan={COLUNAS}>
                            Nenhum combustível ativo cadastrado neste posto.
                        </td>
                    </tr>
                )}

                {produtos.map((produto, i) => {
                    // `compra.produtos` sai na mesma ordem em que os produtos entraram.
                    const linha = compra.produtos[i];

                    return (
                        <tr
                            key={produto.id}
                            style={{ background: `color-mix(in srgb, ${produto.cor} 14%, var(--panel))` }}
                        >
                            <td style={{ borderLeft: `5px solid ${produto.cor}` }}>{produto.nome}</td>
                            <td className="pm-tabela__num">{formatBR(linha.litros, 0)}</td>
                            <td className="pm-tabela__num">{formatCurrency(linha.valor)}</td>
                            <td className="pm-tabela__num">{porLitro(linha.mediaLitro)}</td>
                            <td className="pm-tabela__num pm-tabela__forte">
                                {porLitro(linha.valorParaVenda)}
                            </td>
                            <td className="pm-tabela__num">{percentual(linha.percentualDespesa)}</td>
                        </tr>
                    );
                })}

                {produtos.length > 0 && (
                    <tr className="pm-total pm-total--compra">
                        <td>Total e média</td>
                        <td>{formatBR(compra.totais.litros, 0)}</td>
                        <td>{formatCurrency(compra.totais.valor)}</td>
                        <td>{porLitro(compra.totais.mediaLitro)}</td>
                        <td>{porLitro(compra.totais.valorParaVenda)}</td>
                        <td>{percentual(compra.totais.percentualDespesa)}</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);
