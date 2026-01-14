/**
 * Hook para gerenciamento de sessões de frentistas
 *
 * @remarks
 * Controla valores recebidos por cada frentista,
 * permite adicionar/remover frentistas dinamicamente
 *
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { SessaoFrentista } from '../../../types/fechamento';
import type { Frentista } from '../../../types/database/index';
import { fechamentoFrentistaService } from '../../../services/api';
import { analisarValor, paraReais, formatarValorSimples, formatarValorAoSair } from '../../../utils/formatters';

/**
 * Interface para totais detalhados dos frentistas
 * 
 * @remarks
 * Contém a soma de todos os valores por tipo de pagamento
 * de todas as sessões de frentistas.
 */
export interface TotaisFrentistas {
  /** Total de cartão (débito + crédito consolidado) */
  readonly cartao: number;
  /** Total de cartão débito */
  readonly cartao_debito: number;
  /** Total de cartão crédito */
  readonly cartao_credito: number;
  /** Total de notas a prazo */
  readonly nota: number;
  /** Total de Pix */
  readonly pix: number;
  /** Total em dinheiro */
  readonly dinheiro: number;
  /** Total de baratão/outros */
  readonly baratao: number;
  /** Soma geral de todos os valores */
  readonly total: number;
}

/**
 * Retorno do hook useSessoesFrentistas
 */
interface RetornoSessoesFrentistas {
  sessoes: SessaoFrentista[];
  carregando: boolean;
  totais: TotaisFrentistas;
  carregarSessoes: (data: string, turno: number) => Promise<void>;
  adicionarFrentista: () => void;
  removerFrentista: (tempId: string) => void;
  atualizarSessao: (tempId: string, atualizacoes: Partial<SessaoFrentista>) => void;
  alterarCampoFrentista: (tempId: string, campo: keyof SessaoFrentista, valor: string) => void;
  aoSairCampoFrentista: (tempId: string, campo: keyof SessaoFrentista, valor: string) => void;
  definirSessoes: React.Dispatch<React.SetStateAction<SessaoFrentista[]>>;
}

// [14/01 08:41] Correção: Removido comentário órfão e sincronizado interface

/**
 * Cria uma sessão vazia para novo frentista
 */
const criarSessaoVazia = (): SessaoFrentista => ({
  tempId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  frentistaId: null,
  valor_cartao: '',
  valor_cartao_debito: '',
  valor_cartao_credito: '',
  valor_nota: '',
  valor_pix: '',
  valor_dinheiro: '',
  valor_baratao: '',
  valor_encerrante: '',
  valor_conferido: '',
  observacoes: '',
  valor_produtos: '',
  status: 'pendente'
});

/**
 * Hook customizado para gerenciamento de sessões de frentistas
 *
 * @param postoId - ID do posto ativo
 * @returns Sessões e funções de controle
 *
 * @remarks
 * - Carrega sessões existentes do banco ou inicia com uma vazia
 * - Permite adicionar/remover frentistas dinamicamente
 * - Calcula total de todos os frentistas
 *
 * @example
 * const { sessoes, adicionarFrentista } = useSessoesFrentistas(postoId);
 */
export const useSessoesFrentistas = (
  postoId: number | null,
  frentistas: Frentista[] = []
): RetornoSessoesFrentistas => {
  const [sessoes, setSessoes] = useState<SessaoFrentista[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [inicializado, setInicializado] = useState(false);

  // Inicializa sessões automaticamente para todos os frentistas ativos
  useEffect(() => {
    if (frentistas.length > 0 && !inicializado) {
      const frentistasAtivos = frentistas.filter(f => f.ativo);
      const sessoesIniciais = frentistasAtivos.map(f => ({
        ...criarSessaoVazia(),
        tempId: `frentista-${f.id}`,
        frentistaId: f.id
      }));
      setSessoes(sessoesIniciais);
      setInicializado(true);
      console.log(`✅ ${frentistasAtivos.length} frentistas inicializados`);
    }
  }, [frentistas, inicializado]);

  /**
   * Carrega sessões existentes do banco
   *
   * @param data - Data do fechamento
   * @param turno - Turno selecionado
   */
  const carregarSessoes = useCallback(async (data: string, turno: number) => {
    if (!postoId) return;

    setCarregando(true);
    try {
      const dados = await fechamentoFrentistaService.getByDateAndTurno(
        data,
        turno,
        postoId
      );

      // [14/01 08:45] Correção de mapeamento usando nomes de campos do banco
      // Campos do banco: baratao, encerrante, diferenca_calculada
      // Campos da UI: valor_baratao, valor_encerrante, etc
      // [Fix] Merge inteligente: Dados do Banco + Frentistas Ativos sem dados
      const sessoesMap = new Map<number, SessaoFrentista>();

      // 1. Popula com dados vindos do banco
      if (dados.length > 0) {
        dados.forEach(fs => {
          if (fs.frentista_id) {
            sessoesMap.set(fs.frentista_id, {
              // [Fix] Mapeamento direto dos campos existentes no banco (confirmado via MCP)
              tempId: `existing-${fs.id}`,
              frentistaId: fs.frentista_id,
              valor_cartao: '', // Ignora legado
              valor_cartao_debito: paraReais(fs.valor_cartao_debito),
              valor_cartao_credito: paraReais(fs.valor_cartao_credito),
              valor_nota: paraReais(fs.valor_nota),
              valor_pix: paraReais(fs.valor_pix),
              valor_dinheiro: paraReais(fs.valor_dinheiro),
              valor_baratao: paraReais(fs.baratao),
              valor_encerrante: paraReais(fs.encerrante),
              valor_conferido: paraReais(fs.valor_conferido),
              observacoes: fs.observacoes || '',
              valor_produtos: '',
              status: 'pendente'
            });
          }
        });
      }

      // 2. Garante que TODO frentista ativo tenha uma sessão (vazia ou carregada)
      const frentistasAtivos = frentistas.filter(f => f.ativo);

      const sessoesCompletas = frentistasAtivos.map(f => {
        // Se já tem dados do banco, usa. Se não, cria vazia vinculada a ele.
        const sessaoExistente = sessoesMap.get(f.id);
        if (sessaoExistente) return sessaoExistente;

        return {
          ...criarSessaoVazia(),
          tempId: `auto-${f.id}`,
          frentistaId: f.id // Garante que já vem selecionado
        };
      });

      if (sessoesCompletas.length > 0) {
        setSessoes(sessoesCompletas);
        console.log(`✅ Sessões carregadas e mescladas: ${sessoesCompletas.length} frentistas na tela.`);
      } else {
        // Fallback se não tiver frentistas ativos (ex: erro de cadastro)
        setSessoes([criarSessaoVazia()]);
      }

    } catch (err) {
      console.error('❌ Erro ao carregar sessões (Merge):', err);
      // Mantém estado anterior ou inicia vazio mas tenta respeitar frentistas
      setSessoes(prev => prev.length > 0 ? prev : [criarSessaoVazia()]);
    } finally {
      setCarregando(false);
    }
  }, [postoId, frentistas]);

  /**
   * Adiciona nova sessão de frentista
   */
  const adicionarFrentista = useCallback(() => {
    setSessoes(prev => [...prev, criarSessaoVazia()]);
    console.log('➕ Frentista adicionado');
  }, []);

  /**
   * Remove sessão de frentista
   */
  const removerFrentista = useCallback((tempId: string) => {
    setSessoes(prev => prev.filter(s => s.tempId !== tempId));
    console.log('➖ Frentista removido:', tempId);
  }, []);

  /**
   * Atualiza campos de uma sessão
   */
  const atualizarSessao = useCallback(
    async (tempId: string, atualizacoes: Partial<SessaoFrentista>) => {
      setSessoes(prev =>
        prev.map(fs => (fs.tempId === tempId ? { ...fs, ...atualizacoes } : fs))
      );

      // Persiste mudança de status explicitamente
      if (atualizacoes.status === 'conferido') {
        try {
          const sessao = sessoes.find(s => s.tempId === tempId);
          if (sessao && !tempId.includes('temp-')) {
            const obsAtual = sessao.observacoes || '';
            const obsNova = obsAtual.includes('[CONFERIDO]')
              ? obsAtual
              : `[CONFERIDO] ${obsAtual}`.trim();

            await fechamentoFrentistaService.update(Number(tempId.replace('existing-', '')), {
              observacoes: obsNova
            });

            console.log('✅ Status persistido no banco');
          }
        } catch (err) {
          console.error('❌ Erro ao persistir status:', err);
        }
      }
    },
    [sessoes]
  );

  /**
   * Handler de digitação livre para campos monetários
   *
   * @remarks
   * Aceita apenas números e uma vírgula
   * Impede múltiplas vírgulas
   */
  const alterarCampoFrentista = useCallback(
    (tempId: string, campo: keyof SessaoFrentista, valor: string) => {
      // Campos que não são monetários (como frentistaId ou observações)
      if (campo === 'frentistaId' || campo === 'observacoes' || campo === 'status') {
        atualizarSessao(tempId, { [campo]: valor });
        return;
      }

      // Aplica máscara híbrida para todos os outros (valor_*)
      const formatado = formatarValorSimples(valor);
      atualizarSessao(tempId, { [campo]: formatado });
    },
    [atualizarSessao]
  );

  /**
   * Handler para blur (formata como R$ X,XX)
   */
  const aoSairCampoFrentista = useCallback(
    (tempId: string, campo: keyof SessaoFrentista, valor: string) => {
      if (!valor) return;

      // Campos não monetários não precisam de processamento onBlur
      if (campo === 'frentistaId' || campo === 'observacoes' || campo === 'status') {
        return;
      }

      const formatado = formatarValorAoSair(valor);
      atualizarSessao(tempId, { [campo]: formatado });
    },
    [atualizarSessao]
  );

  /**
   * Calcula totais detalhados de todos os frentistas
   */
  const totais = useMemo((): TotaisFrentistas => {
    return sessoes.reduce((acc, fs) => {
      const cartao = analisarValor(fs.valor_cartao);
      const debito = analisarValor(fs.valor_cartao_debito);
      const credito = analisarValor(fs.valor_cartao_credito);
      const nota = analisarValor(fs.valor_nota);
      const pix = analisarValor(fs.valor_pix);
      const dinheiro = analisarValor(fs.valor_dinheiro);
      const baratao = analisarValor(fs.valor_baratao);

      return {
        cartao: acc.cartao + cartao + debito + credito, // Soma cartao legado + debito + credito
        cartao_debito: acc.cartao_debito + debito,
        cartao_credito: acc.cartao_credito + credito,
        nota: acc.nota + nota,
        pix: acc.pix + pix,
        dinheiro: acc.dinheiro + dinheiro,
        baratao: acc.baratao + baratao,
        total: acc.total + cartao + debito + credito + nota + pix + dinheiro + baratao
      };
    }, { cartao: 0, cartao_debito: 0, cartao_credito: 0, nota: 0, pix: 0, dinheiro: 0, baratao: 0, total: 0 });
  }, [sessoes]);

  return {
    sessoes,
    carregando,
    totais,
    carregarSessoes,
    adicionarFrentista,
    removerFrentista,
    atualizarSessao,
    alterarCampoFrentista,
    aoSairCampoFrentista,
    definirSessoes: setSessoes
  };
};
