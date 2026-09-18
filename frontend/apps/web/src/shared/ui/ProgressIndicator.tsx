import React from 'react';

interface ProgressIndicatorProps {
    current: number;
    total: number;
    label?: string;
    className?: string;
}

/**
 * Indicador de progresso (barra) para formulários e etapas.
 *
 * @remarks
 * Morava em `ValidationAlert.tsx` junto de `ValidationAlert`, `DifferenceAlert`,
 * `StockAlert` e `AlertSeverity`. Em 17/09/2026 os quatro estavam sem nenhum
 * consumidor no monorepo e foram removidos; este era o único vivo, e ganhou
 * arquivo próprio para o caminho do import dizer o que ele é.
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
    current,
    total,
    label,
    className = ''
}) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    const isComplete = current === total;

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className={`text-xs font-bold ${isComplete ? 'text-green-600' : 'text-gray-500'}`}>
                {label || `${current}/${total}`}
            </span>
        </div>
    );
};
