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

import { useState, useCallback, useRef } from 'react';
import type { BicoComDetalhes } from '../types/fechamento';
import { leituraService } from '../services/api';
import { formatarParaBR } from '../utils/formatters';

/**
 * Estrutura de uma leitura
 */
interface Leitura {
  inicial: string;
  fechamento: string;
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
        postoId,
        dataSelecionada,
        turnoSelecionado
      );

      if (dados.length > 0) {
        // Modo edição: usa leituras existentes
        const mapeado = dados.reduce((acc, l) => {
          acc[l.bico_id] = {
            inicial: formatarParaBR(l.leitura_inicial, 3),
            fechamento: formatarParaBR(l.leitura_fechamento, 3)
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
            inicial: ultima ? formatarParaBR(ultima.leitura_fechamento, 3) : '0,000',
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

  return {
    leituras,
    carregando,
    erro,
    carregarLeituras,
    alterarInicial,
    alterarFechamento,
    aoSairInicial,
    aoSairFechamento
  };
};
