import React from 'react';
import { formatBR, formatCurrency } from '@posto/utils';
import type { PlanilhaMensal } from '@posto/utils';
import type { BicoDoBanco, ProdutoDoBanco } from '../model/use-planilha-do-banco';

interface SintesesProps {
    readonly produtos: readonly ProdutoDoBanco[];
    readonly bicos: readonly BicoDoBanco[];
    readonly apurado: PlanilhaMensal;
}

const litros = (v: number) => `${formatBR(v, 0)} L`;
const percentual = (v: number) => `${formatBR(v, 2)}%`;

/**
 * Os três painéis de leitura rápida acima das tabelas: onde o volume está, onde
 * o lucro está, e se o tanque bate.
 *
 * @remarks Não calculam nada — recebem `PlanilhaMensal` pronto. As larguras são
 *          proporção sobre o maior valor da própria série, não sobre o total:
 *          escala relativa é o que deixa a diferença entre o primeiro e o
 *          segundo produto visível quando um deles domina o mês.
 */
export const Sinteses: React.FC<SintesesProps> = ({ produtos, bicos, apurado }) => {
    const { venda, estoque, percas } = apurado;

    /** Nome e cor vêm do cadastro — o cálculo só conhece a chave. */
    const doProduto = (chave: string) => {
        const p = produtos.find((x) => String(x.id) === chave);
        return { nome: p?.nome ?? 'Sem produto', cor: p?.cor ?? 'var(--line2)' };
    };

    const maiorVolume = Math.max(1, ...venda.produtos.map((p) => p.litros));
    const maiorLucro = Math.max(1, ...venda.bicos.map((b) => Math.abs(b.lucro)));
    const maiorEstoque = Math.max(
        1,
        ...estoque.produtos.map((p) => Math.max(p.estoqueTeorico, p.estoqueMedido ?? 0))
    );

    return (
        <div className="pm__faixa pm-sinteses">
            {/* ── Participação nas vendas ─────────────────────────────────── */}
            <section className="pm-painel">
                <div className="pm-painel__topo">
                    <h3 className="pm-painel__titulo">Participação nas vendas</h3>
                    <div className="pm-painel__sub pm__mono">litros vendidos por produto</div>
                </div>
                <div className="pm-painel__corpo">
                    {venda.produtos.length === 0 && (
                        <div className="pm-painel__sub">Sem venda lançada neste mês.</div>
                    )}
                    {venda.produtos.map((p) => {
                        const { nome, cor } = doProduto(p.produto);
                        return (
                            <div key={p.produto}>
                                <div className="pm-legenda">
                                    <span className="pm-legenda__nome">{nome}</span>
                                    <span className="pm__mono" style={{ color: 'var(--muted2)' }}>
                                        {litros(p.litros)} · {percentual(p.participacaoLitros)}
                                    </span>
                                </div>
                                <div className="pm-barra">
                                    <div
                                        className="pm-barra__preenche"
                                        style={{
                                            width: `${(Math.max(0, p.litros) / maiorVolume) * 100}%`,
                                            background: cor,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── Lucro por bico ──────────────────────────────────────────── */}
            <section className="pm-painel">
                <div className="pm-painel__topo">
                    <h3 className="pm-painel__titulo">Lucro por bico</h3>
                    <div className="pm-painel__sub pm__mono">R$ no mês · litros × lucro LT</div>
                </div>
                <div className="pm-painel__corpo" style={{ gap: 8 }}>
                    {venda.bicos.length === 0 && (
                        <div className="pm-painel__sub">Nenhum bico cadastrado.</div>
                    )}
                    {venda.bicos.map((b, i) => (
                        <div key={bicos[i]?.id ?? i} className="pm-lucro-bico">
                            <span className="pm-lucro-bico__nome">{bicos[i]?.nome ?? b.bico}</span>
                            <div className="pm-barra" style={{ height: 14 }}>
                                <div
                                    className="pm-barra__preenche"
                                    style={{
                                        width: `${(Math.abs(b.lucro) / maiorLucro) * 100}%`,
                                        background: b.lucro < 0 ? 'var(--neg)' : doProduto(b.produto).cor,
                                    }}
                                />
                            </div>
                            <span className="pm__mono" style={{ textAlign: 'right', color: 'var(--muted2)' }}>
                                {b.apurado ? formatCurrency(b.lucro) : '—'}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Estoque: teórico × tanque ───────────────────────────────── */}
            <section className="pm-painel">
                <div className="pm-painel__topo">
                    <h3 className="pm-painel__titulo">Estoque: teórico × tanque</h3>
                    <div className="pm-painel__sub pm__mono">
                        barra cheia = teórico · marca escura = medição
                    </div>
                </div>
                <div className="pm-painel__corpo">
                    {estoque.produtos.length === 0 && (
                        <div className="pm-painel__sub">Nenhum combustível cadastrado.</div>
                    )}
                    {estoque.produtos.map((p, i) => {
                        const semMedicao = p.estoqueMedido === null;
                        const litrosPerca = percas[i]?.litros ?? 0;
                        const { nome, cor } = doProduto(p.produto);
                        const corPerca = semMedicao
                            ? 'var(--muted)'
                            : litrosPerca < -0.5
                              ? 'var(--neg)'
                              : litrosPerca > 0.5
                                ? 'var(--pos)'
                                : 'var(--muted)';

                        return (
                            <div key={p.produto}>
                                <div className="pm-legenda">
                                    <span className="pm-legenda__nome">{nome}</span>
                                    <span className="pm__mono" style={{ color: corPerca }}>
                                        {semMedicao
                                            ? 'sem medição'
                                            : `${litrosPerca > 0 ? '+' : ''}${formatBR(litrosPerca, 0)} L`}
                                    </span>
                                </div>
                                <div className="pm-estoque-barra">
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${(Math.max(0, p.estoqueTeorico) / maiorEstoque) * 100}%`,
                                            background: `color-mix(in srgb, ${cor} 40%, var(--panel))`,
                                            borderRight: `2px solid ${cor}`,
                                        }}
                                    />
                                    {!semMedicao && (
                                        <div
                                            className="pm-estoque-barra__marca"
                                            style={{
                                                left: `calc(${(Math.max(0, p.estoqueMedido as number) / maiorEstoque) * 100}% - 1px)`,
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="pm-estoque-barra__pes pm__mono">
                                    <span>teórico {formatBR(p.estoqueTeorico, 0)} L</span>
                                    <span>
                                        tanque {semMedicao ? '—' : formatBR(p.estoqueMedido as number, 0)} L
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};
