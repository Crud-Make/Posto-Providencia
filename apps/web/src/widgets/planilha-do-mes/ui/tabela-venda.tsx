import React from 'react';
import { formatBR, formatCurrency } from '@posto/utils';
import type { PlanilhaMensal } from '@posto/utils';
import type { BicoDoBanco, ProdutoDoBanco } from '../model/use-planilha-do-banco';
import { classeDoSinal, classes } from './sinal';

interface TabelaVendaProps {
    readonly bicos: readonly BicoDoBanco[];
    readonly produtos: readonly ProdutoDoBanco[];
    readonly venda: PlanilhaMensal['venda'];
    /** `lucro ÷ litros` do mês, já apurado — a coluna `Lucro LT` da linha de total. */
    readonly lucroPorLitro: number | null;
}

const COLUNAS = 11;

const litros = (v: number) => formatBR(v, 0);
const encerrante = (v: number | null) => (v === null ? '—' : formatBR(v, 3));
const percentual = (v: number | null) => (v === null ? '—' : `${formatBR(v, 2)}%`);

/**
 * O bloco `Venda`: um encerrante por bico, e o que ele virou em dinheiro.
 *
 * @remarks **Tudo aqui é leitura.** `Inicial` e `Fechamento` são o salto do
 *          encerrante apurado da `Leitura` diária, e `Valor LT` é o preço médio
 *          ponderado do que realmente foi vendido — não o `preco_venda` do
 *          cadastro, que guarda só o preço de hoje e, aplicado a um mês passado,
 *          é o bug do "preço único" que já inflou a venda histórica em 8–11%.
 *
 *          Editar essas células daqui reescreveria dia já fechado. Quem lança é
 *          o **Fechamento de Caixa**, dia a dia.
 *
 *          `Produto vendido` e `Produto %` aparecem **só na linha do primeiro
 *          bico de cada produto**: a gasolina comum tem três bicos e um total
 *          só, e repetir o número nas três linhas faria quem somasse a coluna
 *          chegar ao triplo do volume que o posto girou.
 */
export const TabelaVenda: React.FC<TabelaVendaProps> = ({
    bicos,
    produtos,
    venda,
    lucroPorLitro,
}) => {
    const jaMostrado = new Set<string>();
    const nomeDoProduto = (id: number) => produtos.find((p) => p.id === id)?.nome ?? '—';
    const corDoProduto = (id: number) => produtos.find((p) => p.id === id)?.cor ?? 'var(--line2)';

    return (
        <div className="pm-rolagem">
            <table className="pm-tabela pm-tabela--venda">
                <thead>
                    <tr>
                        <th>Bico</th>
                        <th>Produto</th>
                        <th>Inicial</th>
                        <th>Fechamento</th>
                        <th>Litros</th>
                        <th>Valor LT</th>
                        <th>Valor por bico</th>
                        <th>Lucro LT</th>
                        <th>Lucro bico</th>
                        <th>Margem</th>
                        <th>Produto vendido</th>
                        <th>Produto %</th>
                    </tr>
                </thead>
                <tbody>
                    {bicos.length === 0 && (
                        <tr className="pm-vazio">
                            <td colSpan={COLUNAS + 1}>
                                Nenhum bico ativo cadastrado neste posto. Os bicos vêm do cadastro, em
                                <strong> Tanques (Combustível)</strong>.
                            </td>
                        </tr>
                    )}

                    {bicos.map((bico, i) => {
                        // `venda.bicos` preserva a ordem da entrada — mesma posição, mesmo bico.
                        const linha = venda.bicos[i];
                        const chave = String(bico.produtoId);
                        const agregado = venda.produtos.find((p) => p.produto === chave);
                        const primeiroDoProduto = !jaMostrado.has(chave);
                        jaMostrado.add(chave);

                        const cor = corDoProduto(bico.produtoId);
                        // Lucro e margem são saldo: ganham o sinal em cor. Litro,
                        // encerrante e faturamento não — ver `classeDoSinal`.
                        const sinalLucro = classeDoSinal(linha.apurado ? linha.lucro : null);
                        const sinalLucroLitro = classeDoSinal(linha.lucroLitro);
                        const sinalMargem = classeDoSinal(linha.apurado ? linha.margem : null);

                        return (
                            <tr
                                key={bico.id}
                                style={{ background: `color-mix(in srgb, ${cor} 14%, var(--panel))` }}
                            >
                                <td style={{ borderLeft: `5px solid ${cor}` }}>{bico.nome}</td>
                                <td className="pm-tabela__texto">{nomeDoProduto(bico.produtoId)}</td>
                                <td className="pm-tabela__num">{encerrante(bico.inicial)}</td>
                                <td className="pm-tabela__num">{encerrante(bico.fechamento)}</td>
                                <td className="pm-tabela__num pm-tabela__forte">
                                    {litros(linha.litros)}
                                </td>
                                <td className="pm-tabela__num">
                                    {linha.precoMedio === null ? '—' : formatCurrency(linha.precoMedio)}
                                </td>
                                <td className="pm-tabela__num">{formatCurrency(linha.venda)}</td>
                                <td className={classes('pm-tabela__num', sinalLucroLitro)}>
                                    {linha.lucroLitro === null ? '—' : formatCurrency(linha.lucroLitro)}
                                </td>
                                <td className={classes('pm-tabela__num', sinalLucro)}>
                                    {linha.apurado ? formatCurrency(linha.lucro) : '—'}
                                </td>
                                <td className={classes('pm-tabela__num', sinalMargem)}>
                                    {linha.apurado ? percentual(linha.margem) : '—'}
                                </td>
                                <td className="pm-tabela__num pm-tabela__forte">
                                    {primeiroDoProduto && agregado ? litros(agregado.litros) : ''}
                                </td>
                                <td className="pm-tabela__num">
                                    {primeiroDoProduto && agregado
                                        ? percentual(agregado.participacaoLitros)
                                        : ''}
                                </td>
                            </tr>
                        );
                    })}

                    {bicos.length > 0 && (
                        <tr className="pm-total pm-total--venda">
                            <td>Total e média</td>
                            <td />
                            <td />
                            <td />
                            <td>{litros(venda.totais.litros)}</td>
                            {/* Média PONDERADA (faturamento ÷ litros), não média das linhas: a
                                média simples ignora o peso de cada bico e devolve um preço
                                por litro que nenhum cliente pagou. */}
                            <td>
                                {venda.totais.precoMedio === null
                                    ? '—'
                                    : formatCurrency(venda.totais.precoMedio)}
                            </td>
                            <td>{formatCurrency(venda.totais.venda)}</td>
                            <td className={classeDoSinal(lucroPorLitro)}>
                                {lucroPorLitro === null ? '—' : formatCurrency(lucroPorLitro)}
                            </td>
                            <td className={classeDoSinal(venda.totais.lucro)}>
                                {formatCurrency(venda.totais.lucro)}
                            </td>
                            <td className={classeDoSinal(venda.totais.margem)}>
                                {percentual(venda.totais.margem)}
                            </td>
                            <td>{litros(venda.totais.litros)}</td>
                            <td>{percentual(venda.totais.litros > 0 ? 100 : 0)}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
