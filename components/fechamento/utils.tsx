import React from 'react';
import { Banknote, CreditCard, Smartphone, FileText } from 'lucide-react';

export const parseValue = (value: string | number): number => {
   if (!value) return 0;
   if (typeof value === 'number') return value;

   // Remove espaços e o prefixo "R$" se existir
   let cleaned = value.toString().trim().replace(/^R\$\s*/, '');

   // Se tem vírgula, é formato BR tradicional (1.234.567,890)
   // A vírgula é o separador decimal
   if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
   }

   // Se não tem vírgula mas tem pontos:
   // Para encerrantes de bomba, assumimos que os últimos 3 dígitos são SEMPRE decimais
   // Exemplo: 1.718.359.423 = 1.718.359,423 = 1718359.423
   if (cleaned.includes('.')) {
      // Remove todos os pontos
      const numStr = cleaned.replace(/\./g, '');

      // Se tem mais de 3 dígitos, os últimos 3 são decimais
      if (numStr.length > 3) {
         const inteiro = numStr.slice(0, -3);
         const decimal = numStr.slice(-3);
         return parseFloat(`${inteiro}.${decimal}`) || 0;
      }

      // Se tem 3 ou menos dígitos, é um valor decimal pequeno (0.xxx)
      return parseFloat(`0.${numStr.padStart(3, '0')}`) || 0;
   }

   // Se não tem nem vírgula nem ponto:
   // Também assumimos últimos 3 dígitos como decimais
   if (cleaned.length > 3) {
      const inteiro = cleaned.slice(0, -3);
      const decimal = cleaned.slice(-3);
      return parseFloat(`${inteiro}.${decimal}`) || 0;
   }

   // Número muito pequeno - é decimal
   if (cleaned.length > 0) {
      return parseFloat(`0.${cleaned.padStart(3, '0')}`) || 0;
   }

   return 0;
};

export const formatToBR = (num: number, decimals: number = 3): string => {
   if (num === 0) return '0,' + '0'.repeat(decimals);

   const parts = num.toFixed(decimals).split('.');
   const integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
   const decimal = parts[1] || '0'.repeat(decimals);

   return `${integer},${decimal}`;
};

export const formatSimpleValue = (value: string) => {
   if (!value) return '';

   // Remove tudo que não é número (R$, espaços, pontos, vírgulas)
   let digits = value.replace(/[^\d]/g, '');

   // Se não tem dígitos, retorna vazio
   if (!digits) return '';

   // Remove zeros à esquerda (mas mantém pelo menos 1 se for só zeros)
   digits = digits.replace(/^0+/, '') || '0';

   // Garante pelo menos 3 dígitos (para ter 2 casas decimais)
   // Ex: "1" -> "001" -> "0,01"
   while (digits.length < 3) {
      digits = '0' + digits;
   }

   // Separa parte inteira e decimal (últimos 2 dígitos são centavos)
   const len = digits.length;
   const inteiro = digits.slice(0, len - 2);
   const decimal = digits.slice(len - 2);

   // Formata parte inteira com pontos de milhar
   let inteiroFormatado = inteiro.replace(/^0+/, '') || '0'; // Remove zeros à esquerda
   if (inteiroFormatado.length > 3) {
      inteiroFormatado = inteiroFormatado.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
   }

   return `R$ ${inteiroFormatado},${decimal}`;
};

export const formatValueOnBlur = (value: string) => {
   if (!value) return '';
   return value;
};

export const getPaymentIcon = (tipo: string) => {
   switch (tipo) {
      case 'dinheiro': return <Banknote size={18} className="text-green-600" />;
      case 'cartao_credito': return <CreditCard size={18} className="text-blue-600" />;
      case 'cartao_debito': return <CreditCard size={18} className="text-purple-600" />;
      case 'pix': return <Smartphone size={18} className="text-cyan-600" />;
      default: return <FileText size={18} className="text-gray-600" />;
   }
};

export const getPaymentLabel = (tipo: string) => {
   switch (tipo) {
      case 'dinheiro': return 'Dinheiro';
      case 'cartao_credito': return 'Cartão Crédito';
      case 'cartao_debito': return 'Cartão Débito';
      case 'pix': return 'PIX';
      default: return tipo;
   }
};

export const formatOnBlur = (value: string): string => {
   if (!value) return '';

   // Remove TUDO exceto números (remove pontos e vírgulas)
   let cleaned = value.replace(/[^0-9]/g, '');
   if (cleaned.length === 0) return '';

   // Números muito pequenos (até 3 dígitos): são decimais puros (0,00X)
   if (cleaned.length <= 3) {
      return `0,${cleaned.padStart(3, '0')}`;
   }

   // Separa: últimos 3 dígitos são SEMPRE decimais, resto é inteiro
   let inteiro = cleaned.slice(0, -3);
   const decimal = cleaned.slice(-3);

   // Remove zeros à esquerda da parte inteira
   inteiro = inteiro.replace(/^0+/, '') || '0';

   // Adiciona pontos de milhar
   if (inteiro.length > 3) {
      inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
   }

   return `${inteiro},${decimal}`;
};

export const formatEncerranteInput = (value: string): string => {
   if (!value) return '';

   // Remove tudo exceto números e vírgula
   let cleaned = value.replace(/[^0-9,]/g, '');
   if (cleaned.length === 0) return '';

   // Se tem vírgula, separa parte inteira e decimal
   if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      let inteiro = parts[0] || '';
      let decimal = parts.slice(1).join(''); // Pega tudo após a primeira vírgula

      // Remove zeros à esquerda desnecessários na parte inteira (exceto se for só "0")
      if (inteiro.length > 1) {
         inteiro = inteiro.replace(/^0+/, '') || '0';
      }
      if (inteiro === '') inteiro = '0';

      // Adiciona pontos de milhar na parte inteira
      if (inteiro.length > 3) {
         inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }

      return `${inteiro},${decimal}`;
   }

   // Sem vírgula: apenas formata parte inteira com pontos de milhar
   let inteiro = cleaned;

   // Remove zeros à esquerda desnecessários (exceto se for só "0")
   if (inteiro.length > 1) {
         inteiro = inteiro.replace(/^0+/, '') || '0';
   }

   // Adiciona pontos de milhar
   if (inteiro.length > 3) {
      inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
   }

   return inteiro;
};
