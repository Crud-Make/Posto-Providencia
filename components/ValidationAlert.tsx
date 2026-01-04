import React from 'react';
import { AlertTriangle, AlertOctagon, Info, Lightbulb, X, TrendingDown, TrendingUp } from 'lucide-react';

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'tip';

interface ValidationAlertProps {
    severity: AlertSeverity;
    title: string;
    message: string;
    value?: string | number;
    showClose?: boolean;
    onClose?: () => void;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

const severityStyles: Record<AlertSeverity, {
    container: string;
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    value: string;
}> = {
    critical: {
        container: 'bg-red-50 border-red-200 animate-pulse-subtle',
        iconBg: 'bg-red-100',
        icon: <AlertOctagon size={20} className="text-red-600" />,
        title: 'text-red-800',
        value: 'text-red-600'
    },
    warning: {
        container: 'bg-yellow-50 border-yellow-200',
        iconBg: 'bg-yellow-100',
        icon: <AlertTriangle size={20} className="text-yellow-600" />,
        title: 'text-yellow-800',
        value: 'text-yellow-600'
    },
    info: {
        container: 'bg-blue-50 border-blue-200',
        iconBg: 'bg-blue-100',
        icon: <Info size={20} className="text-blue-600" />,
        title: 'text-blue-800',
        value: 'text-blue-600'
    },
    tip: {
        container: 'bg-green-50 border-green-200',
        iconBg: 'bg-green-100',
        icon: <Lightbulb size={20} className="text-green-600" />,
        title: 'text-green-800',
        value: 'text-green-600'
    }
};

/**
 * Componente genérico para exibição de alertas de validação e informativos.
 * Suporta diferentes severidades (crítico, aviso, info, dica).
 */
const ValidationAlert: React.FC<ValidationAlertProps> = ({
    severity,
    title,
    message,
    value,
    showClose = false,
    onClose,
    action,
    className = ''
}) => {
    const styles = severityStyles[severity];

    return (
        <div className={`${styles.container} border rounded-xl p-4 ${className}`}>
            <div className="flex items-start gap-3">
                <div className={`${styles.iconBg} p-2 rounded-lg flex-shrink-0`}>
                    {styles.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className={`font-bold text-sm ${styles.title}`}>{title}</p>
                        {value !== undefined && (
                            <span className={`text-sm font-bold ${styles.value}`}>
                                {typeof value === 'number'
                                    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                    : value
                                }
                            </span>
                        )}
                    </div>
                    <p className="text-gray-600 text-xs mt-1 leading-relaxed">{message}</p>

                    {action && (
                        <button
                            onClick={action.onClick}
                            className={`mt-3 text-xs font-bold ${styles.title} hover:underline`}
                        >
                            {action.label} →
                        </button>
                    )}
                </div>
                {showClose && onClose && (
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0"
                    >
                        <X size={16} className="text-gray-400" />
                    </button>
                )}
            </div>
        </div>
    );
};

// Difference Alert - specific for cash differences
interface DifferenceAlertProps {
    difference: number;
    threshold?: number;
    requireJustification?: boolean;
    className?: string;
}

/**
 * Alerta específico para exibição de diferenças de caixa (sobra ou falta).
 * 
 * @param difference - Valor da diferença (pode ser positivo ou negativo)
 * @param threshold - Limite a partir do qual a diferença é considerada significativa (padrão R$ 100)
 * @param requireJustification - Se true, exibe o aviso de justificativa obrigatória (padrão true)
 */
export const DifferenceAlert: React.FC<DifferenceAlertProps> = ({
    difference,
    threshold = 100,
    requireJustification = true,
    className = ''
}) => {
    const absDifference = Math.abs(difference);
    const isSignificant = absDifference > threshold;
    const isPositive = difference > 0;

    if (absDifference === 0) return null;

    return (
        <div
            className={`
        flex items-center gap-3 p-4 rounded-xl border transition-all duration-300
        ${isSignificant
                    ? isPositive
                        ? 'bg-green-50 border-green-200'
                        : requireJustification
                            ? 'bg-red-50 border-red-300 animate-pulse-subtle'
                            : 'bg-amber-50 border-amber-200'
                    : 'bg-gray-50 border-gray-200'
                }
        ${className}
      `}
        >
            <div className={`
        p-2 rounded-lg
        ${isSignificant
                    ? isPositive
                        ? 'bg-green-100'
                        : requireJustification ? 'bg-red-100' : 'bg-amber-100'
                    : 'bg-gray-100'
                }
      `}>
                {isPositive
                    ? <TrendingUp size={20} className={isSignificant ? 'text-green-600' : 'text-gray-500'} />
                    : <TrendingDown size={20} className={isSignificant ? (requireJustification ? 'text-red-600' : 'text-amber-600') : 'text-gray-500'} />
                }
            </div>

            <div className="flex-1">
                <p className={`font-bold text-sm ${isSignificant
                    ? isPositive
                        ? 'text-green-800'
                        : requireJustification ? 'text-red-800' : 'text-amber-800'
                    : 'text-gray-700'
                    }`}>
                    {isPositive ? 'Sobra de Caixa' : 'Falta de Caixa'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                    {isSignificant
                        ? isPositive
                            ? 'Valor acima do esperado. Verifique se houve troco incorreto.'
                            : requireJustification
                                ? 'Diferença significativa! Verifique com urgência.'
                                : 'Diferença de caixa identificada (Lançamento Flexível).'
                        : 'Diferença dentro da tolerância aceitável.'
                    }
                </p>
            </div>

            <div className="text-right">
                <p className={`text-xl font-black ${isSignificant
                    ? isPositive
                        ? 'text-green-600'
                        : requireJustification ? 'text-red-600' : 'text-amber-600'
                    : 'text-gray-600'
                    }`}>
                    {isPositive ? '+' : ''}{difference.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                {isSignificant && !isPositive && requireJustification && (
                    <p className="text-[10px] font-bold text-red-500 uppercase mt-1 animate-pulse">
                        Justificativa obrigatória
                    </p>
                )}
            </div>
        </div>
    );
};

// Stock Alert - specific for low inventory
interface StockAlertProps {
    productName: string;
    currentLevel: number;
    capacity: number;
    daysRemaining: number;
    color?: string;
    onRegisterPurchase?: () => void;
    className?: string;
}

/**
 * Alerta específico para níveis de estoque baixos em bicos ou tanques.
 */
export const StockAlert: React.FC<StockAlertProps> = ({
    productName,
    currentLevel,
    capacity,
    daysRemaining,
    color = 'gray',
    onRegisterPurchase,
    className = ''
}) => {
    const percentage = (currentLevel / capacity) * 100;
    const isCritical = percentage < 10;
    const isLow = percentage < 20;

    if (!isLow) return null;

    return (
        <div
            className={`
        p-4 rounded-xl border transition-all duration-300
        ${isCritical
                    ? 'bg-red-50 border-red-300 animate-pulse-subtle'
                    : 'bg-yellow-50 border-yellow-200'
                }
        ${className}
      `}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {isCritical
                        ? <AlertOctagon size={18} className="text-red-500" />
                        : <AlertTriangle size={18} className="text-yellow-500" />
                    }
                    <span className={`font-bold text-sm ${isCritical ? 'text-red-800' : 'text-yellow-800'}`}>
                        {productName}
                    </span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isCritical ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {isCritical ? 'CRÍTICO' : 'BAIXO'}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                    className={`h-full transition-all duration-500 ${isCritical ? 'bg-red-500' : 'bg-yellow-500'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                    {currentLevel.toLocaleString()} / {capacity.toLocaleString()} L ({percentage.toFixed(0)}%)
                </span>
                <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-yellow-600'}`}>
                    ~{daysRemaining} dias restantes
                </span>
            </div>

            {onRegisterPurchase && (
                <button
                    onClick={onRegisterPurchase}
                    className={`
            mt-3 w-full py-2 rounded-lg text-xs font-bold transition-colors
            ${isCritical
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-yellow-500 text-white hover:bg-yellow-600'
                        }
          `}
                >
                    Registrar Compra Urgente
                </button>
            )}
        </div>
    );
};

// Progress Indicator for forms
interface ProgressIndicatorProps {
    current: number;
    total: number;
    label?: string;
    className?: string;
}

/**
 * Indicador de progresso (barra) para formulários e etapas.
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

export default ValidationAlert;
