/**
 * Hook para gerenciamento de leituras dos bicos
 *
 * @remarks
 * Controla leituras inicial e final de cada bico,
 * formatação de entrada de encerrantes e carregamento do banco
 *
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

// [09/01 09:35] Ajuste na integração com serviço de leituras
// Motivo: Correção de nomes de métodos e parâmetros para compatibilidade com API

import React, { useState, useCallback, useRef } from 'react';
import type { BicoComDetalhes } from '../types/fechamento';
import { leituraService } from '../services/api';
import { formatarParaBR } from '../utils/formatters';

/**
 * Estrutura de uma leitura
 */
export interface Leitura {
  inicial: string;
  fechamento: string;
}

/**
 * Resultado de cálculo de litros
 */
interface ResultadoLitros {
  value: number;
  display: string;
}

/**
 * Resultado de cálculo de venda
 */
interface ResultadoVenda {
  value: number;
  display: string;
}

/**
 * Totais calculados
 */
interface Totais {
  litros: number;
  valor: number;
  litrosDisplay: string;
  valorDisplay: string;
}

/**
 * Resumo por combustível
 */
interface ResumoCombustivel {
  nome: string;
  codigo: string;
  litros: number;
  valor: number;
  preco: number;
}

/**
 * Retorno do hook useLeituras
 */
interface RetornoLeituras {
  leituras: Record<number, Leitura>;
  carregando: boolean;
  erro: string | null;
  carregarLeituras: () => Promise<void>;
  alterarInicial: (bicoId: number, valor: string) => void;
  alterarFechamento: (bicoId: number, valor: string) => void;
  aoSairInicial: (bicoId: number) => void;
  aoSairFechamento: (bicoId: number) => void;
  calcLitros: (bicoId: number) => ResultadoLitros;
  calcVenda: (bicoId: number) => ResultadoVenda;
  totals: Totais;
  getSummaryByCombustivel: () => ResumoCombustivel[];
  definirLeituras: React.Dispatch<React.SetStateAction<Record<number, Leitura>>>;
}

/**
 * Formata entrada de encerrante durante digitação
 *
 * @param value - Valor digitado
 * @returns Valor formatado com pontos de milhar
 *
 * @remarks
 * Adiciona pontos de milhar na parte inteira
 * Vírgula deve ser digitada manualmente pelo usuário
 * Ex: "1718359" -> "1.718.359"
 * Ex: "1718359,423" -> "1.718.359,423"
 */
const formatarEntradaEncerrante = (value: string): string => {
  if (!value) return '';

  // Remove tudo exceto números e vírgula
  let limpo = value.replace(/[^0-9,]/g, '');
  if (limpo.length === 0) return '';

  // Se tem vírgula, separa parte inteira e decimal
  if (limpo.includes(',')) {
    const partes = limpo.split(',');
    let inteiro = partes[0] || '';
    let decimal = partes.slice(1).join(''); // Pega tudo após a primeira vírgula

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
  let inteiro = limpo;

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

/**
 * Formata valor ao sair do campo (onBlur)
 *
 * @param value - Valor atual do campo
 * @returns Valor formatado como "1.718.359,423"
 *
 * @remarks
 * Converte qualquer formato para "X.XXX.XXX,XXX"
 * Últimos 3 dígitos são SEMPRE decimais
 */
const formatarAoSair = (value: string): string => {
  if (!value) return '';

  // Remove TUDO exceto números (remove pontos e vírgulas)
  let limpo = value.replace(/[^0-9]/g, '');
  if (limpo.length === 0) return '';

  // Números muito pequenos (até 3 dígitos): são decimais puros (0,00X)
  if (limpo.length <= 3) {
    return `0,${limpo.padStart(3, '0')}`;
  }

  // Separa: últimos 3 dígitos são SEMPRE decimais, resto é inteiro
  let inteiro = limpo.slice(0, -3);
  const decimal = limpo.slice(-3);

  // Remove zeros à esquerda da parte inteira
  inteiro = inteiro.replace(/^0+/, '') || '0';

  // Adiciona pontos de milhar
  if (inteiro.length > 3) {
    inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  return `${inteiro},${decimal}`;
};

/**
 * Hook customizado para gerenciamento de leituras
 *
 * @param postoId - ID do posto ativo
 * @param dataSelecionada - Data do fechamento
 * @param turnoSelecionado - Turno selecionado
 * @param bicos - Lista de bicos com detalhes
 * @returns Leituras e funções de controle
 *
 * @remarks
 * - Carrega leituras do banco ou última leitura como inicial
 * - Formata entrada durante digitação
 * - Formata com 3 decimais ao sair do campo
 *
 * @example
 * const { leituras, alterarInicial } = useLeituras(
 *   postoId, dataSelecionada, turnoSelecionado, bicos
 * );
 */
export const useLeituras = (
  postoId: number | null,
  dataSelecionada: string,
  turnoSelecionado: number | null,
  bicos: BicoComDetalhes[]
): RetornoLeituras => {
  const [leituras, setLeituras] = useState<Record<number, Leitura>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ultimoContextoCarregado = useRef<{ data: string; turno: number | null }>({
    data: '',
    turno: null
  });

  /**
   * Carrega leituras do banco de dados
   *
   * @remarks
   * - Se existir fechamento para data/turno: carrega leituras existentes
   * - Senão: busca última leitura de fechamento para usar como inicial
   */
  const carregarLeituras = useCallback(async () => {
    if (!postoId || !dataSelecionada || !turnoSelecionado || bicos.length === 0) return;

    // Evita recarregar se já carregou para este contexto
    if (
      ultimoContextoCarregado.current.data === dataSelecionada &&
      ultimoContextoCarregado.current.turno === turnoSelecionado
    ) {
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const dados = await leituraService.getByDateAndTurno(
        dataSelecionada,
        turnoSelecionado,
        postoId
      );

      if (dados.length > 0) {
        // Modo edição: usa leituras existentes
        const mapeado = dados.reduce((acc, l) => {
          acc[l.bico_id] = {
            inicial: formatarParaBR(l.leitura_inicial, 3),
            fechamento: formatarParaBR(l.leitura_final, 3)
          };
          return acc;
        }, {} as Record<number, Leitura>);
        setLeituras(mapeado);
        console.log('✅ Leituras existentes carregadas');
      } else {
        // Modo criação: busca última leitura para inicializar
        const ultimasLeituras = await leituraService.getLastReading(postoId);
        const mapeado = bicos.reduce((acc, bico) => {
          const ultima = ultimasLeituras.find(l => l.bico_id === bico.id);
          acc[bico.id] = {
            inicial: ultima ? formatarParaBR(ultima.leitura_final, 3) : '0,000',
            fechamento: '0,000'
          };
          return acc;
        }, {} as Record<number, Leitura>);
        setLeituras(mapeado);
        console.log('✅ Leituras inicializadas com última leitura');
      }

      ultimoContextoCarregado.current = {
        data: dataSelecionada,
        turno: turnoSelecionado
      };
    } catch (err) {
      const mensagemErro = 'Erro ao carregar leituras';
      setErro(mensagemErro);
      console.error('❌', mensagemErro, err);
    } finally {
      setCarregando(false);
    }
  }, [postoId, dataSelecionada, turnoSelecionado, bicos]);

  /**
   * Handler para mudança de leitura inicial
   */
  const alterarInicial = useCallback((bicoId: number, valor: string) => {
    const formatado = formatarEntradaEncerrante(valor);
    setLeituras(prev => ({
      ...prev,
      [bicoId]: { ...prev[bicoId], inicial: formatado }
    }));
  }, []);

  /**
   * Handler para mudança de leitura de fechamento
   */
  const alterarFechamento = useCallback((bicoId: number, valor: string) => {
    const formatado = formatarEntradaEncerrante(valor);
    setLeituras(prev => ({
      ...prev,
      [bicoId]: { ...prev[bicoId], fechamento: formatado }
    }));
  }, []);

  /**
   * Handler para blur no campo inicial (formata com 3 decimais)
   */
  const aoSairInicial = useCallback((bicoId: number) => {
    const valorAtual = leituras[bicoId]?.inicial || '';
    const formatado = formatarAoSair(valorAtual);
    if (formatado !== valorAtual) {
      setLeituras(prev => ({
        ...prev,
        [bicoId]: { ...prev[bicoId], inicial: formatado }
      }));
    }
  }, [leituras]);

  /**
   * Handler para blur no campo fechamento (formata com 3 decimais)
   */
  const aoSairFechamento = useCallback((bicoId: number) => {
    const valorAtual = leituras[bicoId]?.fechamento || '';
    const formatado = formatarAoSair(valorAtual);
    if (formatado !== valorAtual) {
      setLeituras(prev => ({
        ...prev,
        [bicoId]: { ...prev[bicoId], fechamento: formatado }
      }));
    }
  }, [leituras]);

  /**
   * Calcula litros vendidos para um bico
   */
  const calcLitros = useCallback((bicoId: number): ResultadoLitros => {
    const leitura = leituras[bicoId];
    if (!leitura) return { value: 0, display: '-' };

    const inicial = parseFloat(leitura.inicial.replace(/\./g, '').replace(',', '.')) || 0;
    const fechamento = parseFloat(leitura.fechamento.replace(/\./g, '').replace(',', '.')) || 0;

    if (fechamento <= inicial || fechamento === 0) {
      return { value: 0, display: '-' };
    }

    const litros = fechamento - inicial;
    return { value: litros, display: formatarParaBR(litros, 3) };
  }, [leituras]);

  /**
   * Calcula valor de venda para um bico
   */
  const calcVenda = useCallback((bicoId: number): ResultadoVenda => {
    const bico = bicos.find(b => b.id === bicoId);
    if (!bico) return { value: 0, display: '-' };

    const litrosData = calcLitros(bicoId);
    if (litrosData.display === '-') {
      return { value: 0, display: '-' };
    }

    const venda = litrosData.value * bico.combustivel.preco_venda;
    return {
      value: venda,
      display: venda.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    };
  }, [bicos, calcLitros]);

  /**
   * Calcula totais gerais
   */
  const totals = React.useMemo((): Totais => {
    let totalLitros = 0;
    let totalValor = 0;

    bicos.forEach(bico => {
      const litrosData = calcLitros(bico.id);
      const vendaData = calcVenda(bico.id);

      if (litrosData.display !== '-') {
        totalLitros += litrosData.value;
        totalValor += vendaData.value;
      }
    });

    return {
      litros: totalLitros,
      valor: totalValor,
      litrosDisplay: formatarParaBR(totalLitros, 3),
      valorDisplay: totalValor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      })
    };
  }, [bicos, calcLitros, calcVenda]);

  /**
   * Agrupa dados por combustível para resumo
   */
  const getSummaryByCombustivel = useCallback((): ResumoCombustivel[] => {
    const summary: Record<string, ResumoCombustivel> = {};

    bicos.forEach(bico => {
      const codigo = bico.combustivel.codigo;
      if (!summary[codigo]) {
        summary[codigo] = {
          nome: bico.combustivel.nome,
          codigo: codigo,
          litros: 0,
          valor: 0,
          preco: bico.combustivel.preco_venda
        };
      }

      const litrosData = calcLitros(bico.id);
      const vendaData = calcVenda(bico.id);

      if (litrosData.display !== '-') {
        summary[codigo].litros += litrosData.value;
        summary[codigo].valor += vendaData.value;
      }
    });

    return Object.values(summary);
  }, [bicos, calcLitros, calcVenda]);

  return {
    leituras,
    carregando,
    erro,
    carregarLeituras,
    alterarInicial,
    alterarFechamento,
    aoSairInicial,
    aoSairFechamento,
    calcLitros,
    calcVenda,
    totals,
    getSummaryByCombustivel,
    definirLeituras: setLeituras
  };
};
