import React from 'react';
import { formatBR, formatCurrency } from '@posto/utils';
import type { PlanilhaMensal } from '@posto/utils';
import type { ProdutoDoBanco } from '../model/use-planilha-do-banco';
import { CelulaEditavel } from './celula-editavel';

interface TabelaCompraProps {
    readonly produtos: readonly ProdutoDoBanco[];
    readonly compra: PlanilhaMensal['compra'];
    readonly editarCompra: (produtoId: number, campo: 'litros' | 'valor', valor: string) => void;
}

const COLUNAS = 6;

const percentual = (v: number) => `${formatBR(v, 2)}%`;
const porLitro = (v: number | null) => (v === null ? '—' : formatCurrency(v));

/**
 * O bloco `Compra`: quanto entrou de combustível e por quanto ele precisa sair.
 *
 * @remarks `Compra, LT` e `Compra, R$` são a soma das notas do mês na tabela
 *          `Compra`, e **aceitam digitação** desde 16/08/2026, a pedido do dono,
 *          para o replay mês a mês.
 *
 *          O que se digita é o **total do mês**, e ele não sabe a qual nota
 *          pertence. Por isso a gravação não reescreve as notas existentes: ela
 *          mantém tudo que foi lançado com fornecedor, data e volume, e põe a
 *          diferença numa única linha marcada como ajuste da planilha. O rastro
 *          de cada entrega real continua inteiro; o que foi acertado pelo total
 *          fica identificável. Quem lança nota a nota continua sendo a tela de
 *          **Compras**.
 *
 *          `Média LT` e `Valor p/ venda` seguem calculados — são resultado, não
 *          entrada.
 *
 *          ⚠️ `Valor p/ venda` é **piso, não preço sugerido**: cobre a compra e o
 *          rateio da despesa e para exatamente aí. Vender nele dá lucro zero. O
 *          preço de bomba é decisão do dono.
 */
export const TabelaCompra: React.FC<TabelaCompraProps> = ({ produtos, compra, editarCompra }) => (
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
                            <CelulaEditavel
                                valor={produto.compraLitrosTexto}
                                placeholder="litros"
                                rotulo={`Compra de ${produto.nome} em litros`}
                                aoMudar={(v) => editarCompra(produto.id, 'litros', v)}
                            />
                            <CelulaEditavel
                                valor={produto.compraValorTexto}
                                placeholder="R$"
                                rotulo={`Compra de ${produto.nome} em reais`}
                                aoMudar={(v) => editarCompra(produto.id, 'valor', v)}
                            />
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
