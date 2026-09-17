import React from 'react';
import { formatBR, analisarMoedaDigitada } from '@posto/utils';

interface CampoMoedaProps {
    /** Valor em reais. Sempre exibido com 2 casas e separador de milhar. */
    valor: number;
    /** Recebe o valor já em reais, quantizado em centavos. */
    onChange: (valor: number) => void;
    className?: string;
    disabled?: boolean;
    required?: boolean;
    /** Rótulo acessível — o `<label>` do formulário não é associado por `htmlFor`. */
    'aria-label'?: string;
    placeholder?: string;
}

/**
 * Campo de dinheiro em padrão brasileiro, com máscara de centavos.
 *
 * @remarks
 * **Não use `type="number"` para dinheiro.** Ele renderiza o número cru do JavaScript
 * (`2725`, `850.4`, nunca `2.725,00`) e *rejeita* o que o dono digita em formato
 * brasileiro: escrever `3.100,55` faz o DOM devolver `""` e o campo zera sozinho.
 *
 * A máscara é a de centavos: **todo dígito entra pela direita**. Isso elimina o estado
 * intermediário inválido — não existe momento em que o campo contém algo que não seja
 * um valor monetário legítimo — e faz o valor no estado já sair quantizado, sem float
 * quebrado indo parar num `INSERT`.
 *
 * A leitura fica em `analisarMoedaDigitada` (`@posto/utils`), nunca em `analisarValor`:
 * aquele é o parser de **litro** e divide dinheiro por mil.
 *
 * **Zero é exibido como campo vazio**, não como `0,00`. Escrever o zero esconderia o
 * `placeholder` e, pior, satisfaria o `required`: um lançamento de R$ 0,00 passaria
 * pela validação do navegador sem ninguém ver. Vazio, o campo obrigatório volta a
 * barrar. Digitar por cima do vazio funciona igual — a máscara ignora zero à esquerda.
 */
export const CampoMoeda: React.FC<CampoMoedaProps> = ({
    valor,
    onChange,
    className,
    disabled,
    required,
    placeholder,
    'aria-label': ariaLabel,
}) => (
    <input
        type="text"
        inputMode="numeric"
        value={valor === 0 ? '' : formatBR(valor, 2)}
        onChange={(e) => onChange(analisarMoedaDigitada(e.target.value))}
        className={className}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        aria-label={ariaLabel}
    />
);
