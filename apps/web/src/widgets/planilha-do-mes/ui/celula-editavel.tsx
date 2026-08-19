import React from 'react';
import { formatBR } from '@posto/utils';
import { numeroDoCampo } from '../model/campo-numerico';

interface CelulaEditavelProps {
    readonly valor: string;
    readonly aoMudar: (valor: string) => void;
    /** Lido por quem usa leitor de tela, que não enxerga a coluna. */
    readonly rotulo: string;
    readonly placeholder?: string;
    readonly desabilitado?: boolean;
    /** Capacidade do tanque, para o medidor de fundo. `null` desliga. */
    readonly capacidade?: number | null;
    /** Cor do produto — a mesma da faixa lateral da linha. */
    readonly cor?: string;
}

/**
 * Célula numérica digitável, com o nível do tanque desenhado atrás.
 *
 * @remarks Fica com o fundo do painel enquanto as calculadas ficam com o fundo
 *          tingido do produto, e ganhou um filete de acento no pé — é assim que
 *          a tela distingue o que se digita do que se lê.
 *
 *          É `text`, não `number`: `number` engole vírgula em teclado brasileiro
 *          e ainda troca o valor quando a roda do mouse passa por cima do campo.
 *
 *          O medidor acompanha **o que está digitado**, não o que veio do banco:
 *          é o que faz a régua ser conferida com o olho antes de gravar — digitou
 *          um zero a mais, a barra estoura na hora.
 */
export const CelulaEditavel: React.FC<CelulaEditavelProps> = ({
    valor,
    aoMudar,
    rotulo,
    placeholder,
    desabilitado,
    capacidade,
    cor,
}) => {
    const litros = numeroDoCampo(valor);
    const mensuravel =
        !desabilitado && litros !== null && litros >= 0 && !!capacidade && capacidade > 0;
    const fracao = mensuravel ? (litros as number) / (capacidade as number) : 0;

    return (
        <td
            className={desabilitado ? '' : 'pm-tabela__campo pm-medidor'}
            title={
                mensuravel
                    ? `${formatBR(litros as number, 0)} L de ${formatBR(capacidade as number, 0)} L — ${formatBR(fracao * 100, 1)}% do tanque`
                    : undefined
            }
        >
            {mensuravel && (
                <span
                    className="pm-medidor__nivel"
                    style={{
                        width: `${Math.min(fracao, 1) * 100}%`,
                        background: `color-mix(in srgb, ${cor ?? 'var(--acento)'} 38%, transparent)`,
                    }}
                />
            )}
            {mensuravel && fracao > 1 && <span className="pm-medidor__transbordo" />}
            <input
                className="pm-campo pm-medidor__conteudo"
                type="text"
                inputMode="decimal"
                aria-label={rotulo}
                placeholder={desabilitado ? '—' : placeholder}
                disabled={desabilitado}
                value={valor}
                onChange={(e) => aoMudar(e.target.value)}
            />
        </td>
    );
};
