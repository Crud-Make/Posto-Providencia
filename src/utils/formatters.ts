/**
 * Funções utilitárias para formatação de valores
 *
 * @remarks
 * Centraliza lógica de parsing e formatação de números,
 * moedas e valores para padrão brasileiro
 *
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

// [09/01 09:50] Adição de alias parseValue
// Motivo: Compatibilidade com código refatorado que esperava nome em inglês

import React from 'react';
import { Banknote, CreditCard, Smartphone, FileText } from 'lucide-react';

/**
 * Converte string brasileira (vírgula como decimal) para número
 *
 * @param value - Valor em formato brasileiro (ex: "1.234,56" ou "1.718.359,423")
 * @returns Número parseado (ex: 1234.56 ou 1718359.423)
 *
 * @remarks
 * - Remove espaços e prefixo "R$" se existir
 * - Para encerrantes de bomba, assume que os últimos 3 dígitos são SEMPRE decimais
 * - Suporta formato com vírgula (1.234,567) e sem vírgula (1234567)
 *
 * @example
 * parseValue("1.234,56") // 1234.56
 * parseValue("R$ 1.234,56") // 1234.56
 * parseValue("1.718.359.423") // 1718359.423 (encerrante)
 * parseValue("123") // 123.0
 */
export const analisarValor = (value: string): number => {
  if (!value) return 0;

  // Remove espaços e o prefixo "R$" se existir
  let limpo = value.toString().trim().replace(/^R\$\s*/, '');

  // Se tem vírgula, é formato BR tradicional (1.234.567,890)
  // A vírgula é o separador decimal
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
  }

  // Se não tem vírgula mas tem pontos:
  // Para encerrantes de bomba, assumimos que os últimos 3 dígitos são SEMPRE decimais
  // Exemplo: 1.718.359.423 = 1.718.359,423 = 1718359.423
  if (limpo.includes('.')) {
    // Remove todos os pontos
    const numeroString = limpo.replace(/\./g, '');

    // Se tem mais de 3 dígitos, os últimos 3 são decimais
    if (numeroString.length > 3) {
      const inteiro = numeroString.slice(0, -3);
      const decimal = numeroString.slice(-3);
      return parseFloat(`${inteiro}.${decimal}`) || 0;
    }

    // Se tem 3 ou menos dígitos, é um valor decimal pequeno (0.xxx)
    return parseFloat(`0.${numeroString.padStart(3, '0')}`) || 0;
  }

  // Se não tem nem vírgula nem ponto:
  // Também assumimos últimos 3 dígitos como decimais
  if (limpo.length > 3) {
    const inteiro = limpo.slice(0, -3);
    const decimal = limpo.slice(-3);
    return parseFloat(`${inteiro}.${decimal}`) || 0;
  }

  // Número muito pequeno - é decimal
  if (limpo.length > 0) {
    return parseFloat(`0.${limpo.padStart(3, '0')}`) || 0;
  }

  return 0;
};

// Alias para compatibilidade com código legado/refatorado
export const parseValue = analisarValor;

/**
 * Formata número para padrão brasileiro com decimais
 *
 * @param num - Número a formatar
 * @param decimais - Quantidade de casas decimais (padrão: 3)
 * @returns String formatada (ex: "1.234,567")
 *
 * @remarks
 * Adiciona pontos de milhar e vírgula como separador decimal
 * Garante sempre o número correto de casas decimais
 *
 * @example
 * formatarParaBR(1234.567, 3) // "1.234,567"
 * formatarParaBR(1234.5, 2) // "1.234,50"
 * formatarParaBR(0, 3) // "0,000"
 */
export const formatarParaBR = (num: number, decimais: number = 3): string => {
  if (num === 0) return '0,' + '0'.repeat(decimais);

  const partes = num.toFixed(decimais).split('.');
  const inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimal = partes[1] || '0'.repeat(decimais);

  return `${inteiro},${decimal}`;
};

/**
 * Formata um número (ou string numérica) para moeda BRL
 *
 * @param val - Número ou string a formatar
 * @returns String formatada como moeda (ex: "R$ 1.234,56")
 *
 * @remarks
 * Usado para carregar dados do banco de dados na tela
 * Garante sempre 2 casas decimais
 *
 * @example
 * paraReais(1234.56) // "R$ 1.234,56"
 * paraReais("1234.56") // "R$ 1.234,56"
 * paraReais(0) // "R$ 0,00"
 */
export const paraReais = (val: number | string): string => {
  if (val === '' || val === null || val === undefined) return '';
  const num = Number(val);
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });
};

/**
 * Formata valor monetário durante a digitação
 *
 * @param value - Valor digitado
 * @returns Valor formatado com R$ e pontos de milhar
 *
 * @remarks
 * [RESTAURADO 2026-01-08] Comportamento original (antes da máscara calculadora)
 * Issue #3: Máscara estava obrigando digitar "1,0" para obter "10,00"
 *
 * Permite digitação natural:
 * - Digita "10" → R$ 10
 * - Digita "10," → R$ 10,
 * - Digita "10,5" → R$ 10,5
 * - Digita "10,50" → R$ 10,50
 * - Ao sair do campo (onBlur): "R$ 10" → "R$ 10,00"
 *
 * @example
 * formatarValorSimples("10") // "R$ 10"
 * formatarValorSimples("1234") // "R$ 1.234"
 * formatarValorSimples("1234,5") // "R$ 1.234,5"
 */
export const formatarValorSimples = (value: string): string => {
  if (!value) return '';

  // Remove o prefixo R$ e espaços
  let limpo = value.replace(/^R\$\s*/, '').trim();

  // Remove pontos de milhar antigos para processar corretamente
  limpo = limpo.replace(/\./g, '');

  // Se vazio ou só vírgula isolada
  if (!limpo || limpo === ',') return '';

  const partes = limpo.split(',');
  // Garante apenas números na parte inteira
  let inteiro = partes[0].replace(/[^\d]/g, '');

  // Se não sobrou nada na parte inteira
  if (!inteiro && partes.length === 1) return '';
  if (!inteiro) inteiro = '0';

  // Remove zeros à esquerda (ex: 010 -> 10), mas mantém '0' se for só zero
  inteiro = inteiro.replace(/^0+(?=\d)/, '');

  // Adiciona pontos de milhar na parte inteira
  if (inteiro.length > 3) {
    inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Se tem vírgula no valor, mantém a parte decimal como está
  if (partes.length > 1) {
    let decimal = partes.slice(1).join('').replace(/[^\d]/g, '');
    return `R$ ${inteiro},${decimal}`;
  }

  // Se NÃO tem vírgula, retorna SÓ o inteiro (sem ,00)
  // O ,00 será adicionado apenas no onBlur
  return `R$ ${inteiro}`;
};

/**
 * Formata valor ao sair do campo (onBlur)
 *
 * @param value - Valor atual do campo
 * @returns Valor com 2 casas decimais garantidas
 *
 * @remarks
 * Adiciona os centavos ",00" se o usuário não digitou
 * Mantém valor como está se já tem vírgula
 *
 * @example
 * formatarValorAoSair("R$ 123") // "R$ 123,00"
 * formatarValorAoSair("R$ 123,5") // "R$ 123,5"
 * formatarValorAoSair("R$ 123,50") // "R$ 123,50"
 */
export const formatarValorAoSair = (value: string): string => {
  if (!value) return '';

  // Se já tem vírgula, mantém como está
  if (value.includes(',')) return value;

  // Se não tem vírgula, adiciona ,00
  return `${value},00`;
};

/**
 * Retorna ícone apropriado para tipo de pagamento
 *
 * @param tipo - Tipo de pagamento
 * @returns Componente JSX do ícone (lucide-react)
 *
 * @remarks
 * Cores diferenciadas para cada tipo:
 * - Dinheiro: verde
 * - Cartão Crédito: azul
 * - Cartão Débito: roxo
 * - PIX: ciano
 * - Outros: cinza
 *
 * @example
 * obterIconePagamento("dinheiro") // <Banknote /> verde
 * obterIconePagamento("pix") // <Smartphone /> ciano
 */
export const obterIconePagamento = (tipo: string): React.ReactElement => {
  switch (tipo) {
    case 'dinheiro':
      return React.createElement(Banknote, { size: 18, className: 'text-green-600' });
    case 'cartao_credito':
      return React.createElement(CreditCard, { size: 18, className: 'text-blue-600' });
    case 'cartao_debito':
      return React.createElement(CreditCard, { size: 18, className: 'text-purple-600' });
    case 'pix':
      return React.createElement(Smartphone, { size: 18, className: 'text-cyan-600' });
    default:
      return React.createElement(FileText, { size: 18, className: 'text-gray-600' });
  }
};

/**
 * Retorna label traduzido para tipo de pagamento
 *
 * @param tipo - Tipo de pagamento
 * @returns Label em português
 *
 * @remarks
 * Converte tipos do banco de dados para nomes amigáveis
 *
 * @example
 * obterLabelPagamento("cartao_credito") // "Cartão Crédito"
 * obterLabelPagamento("pix") // "PIX"
 */
export const obterLabelPagamento = (tipo: string): string => {
  switch (tipo) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'cartao_credito':
      return 'Cartão Crédito';
    case 'cartao_debito':
      return 'Cartão Débito';
    case 'pix':
      return 'PIX';
    default:
      return tipo;
  }
};
