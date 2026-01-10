// [10/01 08:25] Extração de funções auxiliares do StrategicDashboard

/**
 * Formata valores monetários, abreviando se necessário (k, M)
 */
export const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value.toFixed(2)}`;
};

/**
 * Formata volumes em Litros, abreviando se necessário
 */
export const formatVolume = (value: number): string => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k L`;
    return `${value.toFixed(0)} L`;
};

/**
 * Retorna o nome do dia da semana abreviado
 */
export const getDayOfWeek = (date: Date): string => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    return days[date.getDay()];
};
