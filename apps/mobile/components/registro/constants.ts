import {
    CreditCard,
    Receipt,
    Smartphone,
    Banknote
} from 'lucide-react-native';
import type { FormaPagamento } from './types';

/**
 * Lista de formas de pagamento disponíveis no sistema.
 * Configuração estática de cores e ícones.
 */
export const FORMAS_PAGAMENTO: FormaPagamento[] = [
    { id: 'debito', label: 'Débito', icon: CreditCard, color: '#2563eb', bgColor: '#eff6ff' },
    { id: 'credito', label: 'Crédito', icon: CreditCard, color: '#7c3aed', bgColor: '#f5f3ff' },
    { id: 'nota', label: 'Nota/Vale', icon: Receipt, color: '#0891b2', bgColor: '#ecfeff' },
    { id: 'pix', label: 'PIX', icon: Smartphone, color: '#059669', bgColor: '#ecfdf5' },
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: '#16a34a', bgColor: '#f0fdf4' },
];
