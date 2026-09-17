import React from 'react';

interface InputFinanceiroProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: string;
    onChangeValue: (value: string) => void;
    allowDecimals?: boolean;
    className?: string;
}

export const InputFinanceiro: React.FC<InputFinanceiroProps> = ({
    value,
    onChangeValue,
    allowDecimals = true,
    className,
    ...props
}) => {

    const formatInputValue = (val: string, decimals: boolean): string => {
        if (!val) return '';
        // Remove tudo exceto dígitos e vírgula
        let cleaned = val.replace(/[^\d,]/g, '');
        
        // Garante apenas uma vírgula
        const parts = cleaned.split(',');
        if (parts.length > 2) {
            cleaned = parts[0] + ',' + parts.slice(1).join('');
        }

        if (decimals && cleaned.includes(',')) {
            // Separar parte inteira e decimal
            const [intPart, decPart] = cleaned.split(',');
            // Adicionar pontos como separadores de milhar na parte inteira
            const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            // Limitar decimais a 3 casas (leituras de bomba usam 3)
            const formattedDec = decPart ? decPart.slice(0, 3) : '';
            return formattedInt + ',' + formattedDec;
        } else {
            // Apenas números inteiros - adicionar pontos como separadores de milhar
            const intOnly = cleaned.replace(',', '');
            return intOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatInputValue(e.target.value, allowDecimals);
        onChangeValue(formatted);
    };

    return (
        <input
            type="text"
            value={value}
            onChange={handleChange}
            className={className}
            {...props}
        />
    );
};
