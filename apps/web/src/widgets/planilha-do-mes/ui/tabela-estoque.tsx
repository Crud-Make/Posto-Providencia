import React from 'react';
import { formatBR } from '@posto/utils';
import type { PlanilhaMensal } from '@posto/utils';
import type { ProdutoDoBanco } from '../model/use-planilha-do-banco';
import { CelulaEditavel } from './celula-editavel';

interface TabelaEstoqueProps {
    readonly produtos: readonly ProdutoDoBanco[];
    readonly estoque: PlanilhaMensal['estoque'];
    readonly percas: PlanilhaMensal['percas'];
    readonly percaTotal: number;
    readonly percaPercentual: number | null;
    readonly editarMedicao: (
        produtoId: number,
        campo: 'estoqueAnterior' | 'estoqueTanque',
        valor: string
    ) => void;
}

const COLUNAS = 8;

const litros = (v: number) => formatBR(v, 0);
const percentual = (v: number | null) => (v === null ? '—' : `${formatBR(v, 2)}%`);

/**
 * Cor da perda: vermelho quando falta combustível, verde quando sobra.
 *
 * @remarks A folga de meio litro existe porque medição de régua não tem
 *          resolução de mililitro — pintar 0,2 L de diferença de vermelho
 *          ensinaria o dono a ignorar a cor, e aí a perda de verdade passa
 *          despercebida junto.
 */
const corDaPerca = (v: number): string =>
    v < -0.5 ? 'var(--neg)' : v > 0.5 ? 'var(--pos)' : 'var(--muted2)';

/**
 * O bloco `Estoque`: o que deveria haver no tanque contra o que a régua mediu.
 *
 * @remarks É a única tabela **editável** da tela, e a única cujo mapeamento com
 *          o banco é inequívoco: `Estoque anterior` e `Estoque tanque` viram uma
 *          linha de `HistoricoTanque` por tanque e data — exatamente o que a
 *          régua produz. Nenhuma das duas sai de cálculo: é gente olhando o
 *          tanque, e sem elas não existe perda apurável.
 *
 *          O sinal segue a planilha, ao contrário do da diferença de caixa:
 *          **negativo = PERDA**, positivo = sobra.
 */
export const TabelaEstoque: React.FC<TabelaEstoqueProps> = ({
    produtos,
    estoque,
    percas,
    percaTotal,
    percaPercentual,
    editarMedicao,
}) => (
    <div className="pm-rolagem">
        <table className="pm-tabela pm-tabela--estoque">
            <thead>
                <tr>
                    <th>Produto</th>
                    <th>Estoque anterior</th>
                    <th>Compra + estoque</th>
                    <th>Vendido</th>
                    <th>Estoque hoje</th>
                    <th>Estoque tanque</th>
                    <th>Perca e sobra</th>
                    <th>% s/ vendido</th>
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
                    const linha = estoque.produtos[i];
                    const perca = percas[i];
                    const cor = corDaPerca(perca.litros);
                    const semTanque = produto.tanqueId === null;

                    return (
                        <tr
                            key={produto.id}
                            style={{ background: `color-mix(in srgb, ${produto.cor} 14%, var(--panel))` }}
                        >
                            <td style={{ borderLeft: `5px solid ${produto.cor}` }}>
                                {produto.nome}
                                {semTanque && (
                                    <span className="pm-tabela__aviso" title="Sem tanque cadastrado — a medição não tem onde ser gravada">
                                        sem tanque
                                    </span>
                                )}
                            </td>

                            <CelulaEditavel
                                valor={produto.estoqueAnterior}
                                placeholder="medir"
                                desabilitado={semTanque}
                                rotulo={`Estoque anterior de ${produto.nome}`}
                                aoMudar={(v) => editarMedicao(produto.id, 'estoqueAnterior', v)}
                            />

                            <td className="pm-tabela__num">{litros(linha.compraEEstoque)}</td>
                            <td className="pm-tabela__num">{litros(linha.litrosVendidos)}</td>
                            <td className="pm-tabela__num pm-tabela__forte">
                                {litros(linha.estoqueTeorico)}
                            </td>

                            <CelulaEditavel
                                valor={produto.estoqueTanque}
                                placeholder="medir"
                                desabilitado={semTanque}
                                rotulo={`Medição do tanque de ${produto.nome}`}
                                aoMudar={(v) => editarMedicao(produto.id, 'estoqueTanque', v)}
                            />

                            {/* Sem medição de fechamento não há perda a apurar — e "não medi"
                                não pode aparecer como "não perdi". */}
                            <td className="pm-tabela__num" style={{ color: cor, fontWeight: 700 }}>
                                {linha.estoqueMedido === null ? '—' : litros(perca.litros)}
                            </td>
                            <td className="pm-tabela__num" style={{ color: cor }}>
                                {percentual(perca.percentual)}
                            </td>
                        </tr>
                    );
                })}

                {produtos.length > 0 && (
                    <tr className="pm-total pm-total--estoque">
                        <td>Total e média</td>
                        <td>{litros(estoque.totais.estoqueAnterior)}</td>
                        <td>{litros(estoque.totais.compraEEstoque)}</td>
                        <td>{litros(estoque.totais.litrosVendidos)}</td>
                        <td>{litros(estoque.totais.estoqueTeorico)}</td>
                        <td>
                            {estoque.totais.estoqueMedido === null
                                ? '—'
                                : litros(estoque.totais.estoqueMedido)}
                        </td>
                        <td>{litros(percaTotal)}</td>
                        <td>{percentual(percaPercentual)}</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);
