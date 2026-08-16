import React from 'react';

interface CelulaEditavelProps {
    readonly valor: string;
    readonly aoMudar: (valor: string) => void;
    /** Lido por quem usa leitor de tela, que não enxerga a coluna. */
    readonly rotulo: string;
    readonly placeholder?: string;
    readonly desabilitado?: boolean;
}

/**
 * Célula numérica digitável.
 *
 * @remarks Fica com o fundo do painel enquanto as calculadas ficam com o fundo
 *          tingido do produto — é assim que a planilha do dono distingue o que
 *          se digita do que se lê, e o cabeçalho da tela repete a regra em
 *          palavras.
 *
 *          É `text`, não `number`: `number` engole vírgula em teclado brasileiro
 *          e ainda troca o valor quando a roda do mouse passa por cima do campo.
 */
export const CelulaEditavel: React.FC<CelulaEditavelProps> = ({
    valor,
    aoMudar,
    rotulo,
    placeholder,
    desabilitado,
}) => (
    <td className={desabilitado ? '' : 'pm-tabela__campo'}>
        <input
            className="pm-campo"
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
