import React from 'react';
import { formatBR, formatCurrency } from '@posto/utils';
import type { GeometriaEntregas } from '../model/geometria-series';

interface GraficoEntregasProps {
    readonly geometria: GeometriaEntregas;
    /** Preço médio do mês (R$/L). `null` sem compra lançada. */
    readonly precoMedio: number | null;
}

/**
 * As entregas do mês: quanto chegou em cada uma, e por que preço.
 *
 * @remarks Uma coluna por **dia em que chegou combustível**, tirada da tabela
 *          `Compra` — não um mês repartido em pedaços iguais. Duas notas no
 *          mesmo dia viram uma coluna só, com o preço ponderado pelo volume.
 */
export const GraficoEntregas: React.FC<GraficoEntregasProps> = ({ geometria, precoMedio }) => {
    if (geometria.colunas.length === 0) {
        return (
            <div className="pm-gpe">
                <div className="pm-gpe__topo">
                    <div className="pm-gpe__titulo">Entregas no mês</div>
                </div>
                <p className="pm-gpe__vazio">
                    Nenhuma compra lançada neste mês — sem ela não há custo médio, e sem custo médio
                    não há lucro a apurar.
                </p>
            </div>
        );
    }

    return (
        <div className="pm-gpe">
            <div className="pm-gpe__topo">
                <div className="pm-gpe__titulo">Entregas no mês</div>
                <div className="pm-gpe__legendas pm__mono">
                    <span className="pm-gpe__legenda">
                        <span className="pm-gpe__amostra" style={{ background: 'var(--compra-barra)' }} />
                        litros por entrega
                    </span>
                    <span className="pm-gpe__legenda">
                        <span className="pm-gpe__traco" />
                        preço do LT
                    </span>
                    <span className="pm-gpe__stat">
                        {precoMedio === null
                            ? '—'
                            : `preço médio ${formatCurrency(precoMedio)}/L`}
                    </span>
                </div>
            </div>

            <div className="pm-plano">
                <div className="pm-plano__guia" style={{ top: '25%' }} />
                <div className="pm-plano__guia" style={{ top: '50%' }} />
                <div className="pm-plano__guia" style={{ top: '75%' }} />

                <div className="pm-colunas">
                    {geometria.colunas.map((c) => (
                        <div key={c.dia} className="pm-coluna">
                            <div className="pm-coluna__rotulo pm__mono">
                                {c.litros >= 1000
                                    ? `${formatBR(c.litros / 1000, 1)} mil L`
                                    : `${formatBR(c.litros, 0)} L`}
                            </div>
                            <div
                                className="pm-coluna__barra"
                                title={`Entrega dia ${c.dia}: ${formatBR(c.litros, 0)} L${
                                    c.precoLitro === null
                                        ? ''
                                        : ` a ${formatCurrency(c.precoLitro)}/L`
                                }`}
                                style={{
                                    height: c.altura,
                                    background: 'var(--compra-barra)',
                                    opacity: 0.85,
                                }}
                            />
                        </div>
                    ))}
                </div>

                <svg className="pm-plano__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline
                        points={geometria.linha}
                        fill="none"
                        stroke="var(--ink)"
                        strokeWidth={1.8}
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </div>

            <div style={{ display: 'flex', gap: 16, padding: '0 10px', marginTop: 6 }}>
                {geometria.colunas.map((c) => (
                    <div
                        key={c.dia}
                        className="pm__mono"
                        style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--muted)' }}
                    >
                        dia {c.dia}
                    </div>
                ))}
            </div>
        </div>
    );
};
