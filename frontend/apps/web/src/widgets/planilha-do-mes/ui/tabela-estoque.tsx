import React from 'react';
import { formatBR } from '@posto/utils';
import type { PlanilhaMensal } from '@posto/utils';
import type { ProdutoDoBanco } from '../model/use-planilha-do-banco';
import { CelulaEditavel } from './celula-editavel';
import { MedidorTanque } from './medidor-tanque';
import { classeDoSinal } from './sinal';

interface TabelaEstoqueProps {
    readonly produtos: readonly ProdutoDoBanco[];
    readonly estoque: PlanilhaMensal['estoque'];
    readonly percas: PlanilhaMensal['percas'];
    readonly percaTotal: number | null;
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
                    const cor = perca.litros === null ? 'var(--muted)' : corDaPerca(perca.litros);
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
                                capacidade={produto.capacidadeTanque}
                                cor={produto.cor}
                                rotulo={`Estoque anterior de ${produto.nome}`}
                                aoMudar={(v) => editarMedicao(produto.id, 'estoqueAnterior', v)}
                            />

                            <td className="pm-tabela__num">{litros(linha.compraEEstoque)}</td>
                            <td className="pm-tabela__num">{litros(linha.litrosVendidos)}</td>
                            {/* O que a conta diz que deveria ter no tanque. */}
                            <MedidorTanque
                                litros={linha.estoqueTeorico}
                                capacidade={produto.capacidadeTanque}
                                cor={produto.cor}
                                className="pm-tabela__num pm-tabela__forte"
                            >
                                {litros(linha.estoqueTeorico)}
                            </MedidorTanque>

                            <CelulaEditavel
                                valor={produto.estoqueTanque}
                                placeholder="medir"
                                desabilitado={semTanque}
                                capacidade={produto.capacidadeTanque}
                                cor={produto.cor}
                                rotulo={`Medição do tanque de ${produto.nome}`}
                                aoMudar={(v) => editarMedicao(produto.id, 'estoqueTanque', v)}
                            />

                            {/* Sem medição de fechamento não há perda a apurar — e "não medi"
                                não pode aparecer como "não perdi". */}
                            {/* Estoque teórico negativo é impossível físico: falta
                                entrada, não sobrou combustível. Mostrar o número
                                aqui seria anunciar uma sobra enorme — a leitura
                                mais tranquilizadora possível para o número que
                                existe para acusar falta. */}
                            <td className="pm-tabela__num" style={{ color: cor, fontWeight: 700 }}>
                                {perca.litros === null ? '—' : litros(perca.litros)}
                                {perca.impossivel && (
                                    <span className="pm-tabela__aviso" title="Estoque teórico negativo — falta compra lançada ou legível">
                                        sem compra
                                    </span>
                                )}
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
                        {/* O total de perca é o número mais importante do bloco
                            e era o único sem cor de status: a regra da linha de
                            total fixava a tinta e engolia o sinal que TODAS as
                            linhas acima carregam. */}
                        <td className={classeDoSinal(percaTotal)}>
                            {percaTotal === null ? '—' : litros(percaTotal)}
                        </td>
                        <td className={classeDoSinal(percaPercentual)}>
                            {percentual(percaPercentual)}
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);
