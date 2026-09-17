import React from 'react';
import { formatBR } from '@posto/utils';
import type { GeometriaAcumulada } from '../model/geometria-series';

interface GraficoAcumuladoProps {
    readonly titulo: string;
    readonly geometria: GeometriaAcumulada;
    /** Cor das barras diárias. */
    readonly cor: string;
    readonly legendaBarra: string;
    readonly legendaLinha: string;
    /** Frase curta à direita das legendas (`média 1.561 L/dia`). */
    readonly resumo: string;
    readonly picoRotulo: string;
    /** Preenchimento sob a linha. Ausente usa a tinta do texto, bem apagada. */
    readonly corArea?: string;
    readonly tooltipBarra: (litros: number, dia: number) => string;
    /** Mostrado no lugar do gráfico quando o mês não tem movimento lançado. */
    readonly vazio?: string;
}

/**
 * Barras diárias com uma linha acumulada por cima — o gráfico que a Venda e o
 * Estoque usam, com séries diferentes.
 *
 * @remarks A linha vive num SVG de viewBox fixo (`0 0 100 100`) esticado sem
 *          preservar proporção, e as barras num flex por cima do mesmo espaço.
 *          É o que mantém os dois alinhados em qualquer largura sem recalcular
 *          nada no redimensionamento.
 *
 *          Cada barra é **um dia que existiu** — vem da `Leitura` diária. Enquanto
 *          a tela não lia o banco, esta curva era simulada e ostentava a etiqueta
 *          "simulação"; a etiqueta saiu junto com a simulação.
 */
export const GraficoAcumulado: React.FC<GraficoAcumuladoProps> = ({
    titulo,
    geometria,
    cor,
    legendaBarra,
    legendaLinha,
    resumo,
    picoRotulo,
    corArea,
    tooltipBarra,
    vazio,
}) => (
    <div className="pm-gpe">
        <div className="pm-gpe__topo">
            <div className="pm-gpe__titulo">{titulo}</div>
            {!vazio && (
                <div className="pm-gpe__legendas pm__mono">
                    <span className="pm-gpe__legenda">
                        <span className="pm-gpe__amostra" style={{ background: cor }} />
                        {legendaBarra}
                    </span>
                    <span className="pm-gpe__legenda">
                        <span className="pm-gpe__traco" />
                        {legendaLinha}
                    </span>
                    <span className="pm-gpe__stat">{resumo}</span>
                </div>
            )}
        </div>

        {vazio ? (
            <p className="pm-gpe__vazio">{vazio}</p>
        ) : (
            <>
                <div className="pm-plano">
                    <div className="pm-plano__guia" style={{ top: '25%' }} />
                    <div className="pm-plano__guia" style={{ top: '50%' }} />
                    <div className="pm-plano__guia" style={{ top: '75%' }} />
                    <span className="pm-plano__pico pm__mono">pico {picoRotulo}</span>

                    <div className="pm-plano__barras">
                        {geometria.barras.map((b) => (
                            <div
                                key={b.dia}
                                className="pm-plano__barra"
                                title={tooltipBarra(b.litros, b.dia)}
                                style={{
                                    height: b.altura,
                                    background: cor,
                                    opacity: corArea ? 0.45 : 0.8,
                                }}
                            />
                        ))}
                    </div>

                    <svg className="pm-plano__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon
                            points={geometria.area}
                            fill={corArea ?? 'var(--ink)'}
                            opacity={corArea ? 0.12 : 0.07}
                        />
                        <polyline
                            points={geometria.linha}
                            fill="none"
                            stroke="var(--ink)"
                            strokeWidth={1.8}
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                </div>

                <div className="pm-plano__eixo pm__mono">
                    <span>dia 1</span>
                    <span>dia 8</span>
                    <span>dia 15</span>
                    <span>dia 22</span>
                    <span>dia {formatBR(geometria.diasNoMes, 0)}</span>
                </div>
            </>
        )}
    </div>
);
