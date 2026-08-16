import React from 'react';
import { formatBR } from '@posto/utils';

interface MedidorTanqueProps {
    /** Volume a representar, em litros. `null` quando não há o que medir. */
    readonly litros: number | null;
    /** Capacidade do tanque. `null` desliga o medidor. */
    readonly capacidade: number | null;
    /** Cor do produto — a mesma da faixa lateral da linha. */
    readonly cor: string;
    /** O que aparece por cima do preenchimento. */
    readonly children: React.ReactNode;
    readonly className?: string;
}

/**
 * Célula de tabela que desenha o nível do tanque atrás do número.
 *
 * @remarks A leitura que ela resolve: um volume em litros não diz se o tanque
 *          está cheio ou raspando. `5.672 L` é tranquilo num tanque de 30.000 e
 *          é véspera de faltar produto num de 6.000. O preenchimento é
 *          `volume ÷ capacidade`, com a cor do próprio combustível.
 *
 *          **Volume negativo não é desenhado como barra vazia**: estoque teórico
 *          negativo é impossível físico (falta compra lançada), e uma barra
 *          zerada leria como "tanque no fim" em vez de "conta furada". Nesse
 *          caso o medidor não aparece e o número segue sozinho, já em vermelho.
 *
 *          Acima de 100% a barra trava na largura da célula e ganha um risco
 *          vermelho na borda: é o sinal de que o volume passou da capacidade
 *          cadastrada, o que só acontece com cadastro errado ou lançamento a
 *          mais — nos dois casos o número não deve parecer normal.
 */
export const MedidorTanque: React.FC<MedidorTanqueProps> = ({
    litros,
    capacidade,
    cor,
    children,
    className,
}) => {
    const mensuravel = litros !== null && litros >= 0 && capacidade !== null && capacidade > 0;

    if (!mensuravel) {
        return <td className={className}>{children}</td>;
    }

    const fracao = (litros as number) / (capacidade as number);
    const transbordou = fracao > 1;
    const largura = Math.min(fracao, 1) * 100;

    return (
        <td
            className={`${className ?? ''} pm-medidor`.trim()}
            title={`${formatBR(litros as number, 0)} L de ${formatBR(capacidade as number, 0)} L — ${formatBR(fracao * 100, 1)}% do tanque`}
        >
            <span
                className="pm-medidor__nivel"
                style={{
                    width: `${largura}%`,
                    background: `color-mix(in srgb, ${cor} 38%, transparent)`,
                }}
            />
            {transbordou && <span className="pm-medidor__transbordo" />}
            <span className="pm-medidor__conteudo">{children}</span>
        </td>
    );
};
