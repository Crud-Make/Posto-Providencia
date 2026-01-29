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

// [18/01 00:00] Adaptar consumo do fechamentoFrentistaService para ApiResponse
// Motivo: Services agora retornam { success, data, error } (Smart Types)

import { useState, useCallback, useMemo, useRef } from 'react';
import type { SessaoFrentista } from '../../../types/fechamento';
import type { Frentista } from '../../../types/database/index';
import { fechamentoFrentistaService, frentistaService } from '../../../services/api';
import { analisarValor, paraReais, formatarValorSimples, formatarValorAoSair } from '../../../utils/formatters';
import { isSuccess } from '../../../types/ui/response-types';

/**
 * Interface para totais detalhados dos frentistas
 */
export interface TotaisFrentistas {
  cartao: number;
  cartao_debito: number;
  cartao_credito: number;
  nota: number;
  pix: number;
  dinheiro: number;
  baratao: number;
  total: number;
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

// ... (interfaces mantidas)

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
// [20/01 05:35] Fix: Adicionado parâmetro opcional frentistasCadastrados para evitar erro de referência
export const useSessoesFrentistas = (
  postoId: number | null,
  frentistasCadastrados: Frentista[] = []
): RetornoSessoesFrentistas => {
  const [sessoes, setSessoes] = useState<SessaoFrentista[]>([]);
  const [carregando, setCarregando] = useState(false);
  const ultimoContextoCarregado = useRef<{ data: string; turno: number | null }>({
    data: '',
    turno: null
  });

  /**
   * Carrega sessões existentes do banco
   *
   * @param data - Data do fechamento
   * @param turno - Turno selecionado
   */
  const carregarSessoes = useCallback(async (data: string, turno: number) => {
    if (!postoId) return;

    // [29/01 13:40] Evita recarregar se já carregou para este contexto
    if (
      ultimoContextoCarregado.current.data === data &&
      ultimoContextoCarregado.current.turno === turno
    ) {
      return;
    }

    setCarregando(true);
    try {
      // [18/01 00:00] Checar success e extrair data do ApiResponse
      // Motivo: fechamentoFrentistaService agora retorna ApiResponse
      const dadosRes = await fechamentoFrentistaService.getByDateAndTurno(
        data,
        turno,
        postoId
      );

      if (!isSuccess(dadosRes)) {
        console.error('❌ Erro ao carregar sessões:', dadosRes.error);
        setSessoes([]);
        return;
      }

      const dados = dadosRes.data;

      if (dados.length > 0) {
        // [29/01 13:40] Sessões de frentistas carregadas do banco
        console.log('[29/01 13:40] Sessões de frentistas carregadas do banco:', dados.length, 'registros');
        const mapeadas: SessaoFrentista[] = dados.map(fs => ({
          tempId: `existing-${fs.id}`,
          frentistaId: fs.frentista_id,
          valor_cartao: paraReais(fs.valor_cartao ?? 0),
          valor_cartao_debito: paraReais(fs.valor_cartao_debito ?? 0),
          valor_cartao_credito: paraReais(fs.valor_cartao_credito ?? 0),
          valor_nota: paraReais(fs.valor_nota),
          valor_pix: paraReais(fs.valor_pix),
          valor_dinheiro: paraReais(fs.valor_dinheiro),
          valor_baratao: paraReais(fs.baratao ?? 0),
          valor_encerrante: paraReais(fs.encerrante ?? 0),
          valor_conferido: paraReais(fs.valor_conferido ?? 0),
          observacoes: fs.observacoes || '',
          valor_produtos: paraReais(fs.valor_produtos || 0),
          status: (fs.status as 'pendente' | 'conferido') || 'pendente',
          data_hora_envio: fs.data_hora_envio
        }));
        setSessoes(mapeadas);
        console.log('[29/01 13:40] Sessões de frentistas mapeadas:', mapeadas.length, 'frentistas');
      } else {
        // [20/01 11:55] Se não houver sessões salvas, carrega frentistas ativos
        // Motivo: Usuário deseja que os frentistas ativos apareçam automaticamente na nova tela

        let frentistasParaSessao: Frentista[] = [];

        // Prioriza a lista passada via props (já carregada no contexto)
        if (frentistasCadastrados.length > 0) {
          frentistasParaSessao = frentistasCadastrados.filter(f => f.ativo);
        } else {
          // Fallback: busca via API se a lista props estiver vazia
          const frentistasRes = await frentistaService.getAll(postoId);
          if (isSuccess(frentistasRes)) {
            frentistasParaSessao = frentistasRes.data;
          }
        }

        if (frentistasParaSessao.length > 0) {
          const sessoesIniciais = frentistasParaSessao.map(f => ({
            ...criarSessaoVazia(),
            frentistaId: f.id,
            // Mantém tempId gerado pelo criarSessaoVazia, mas garante unicidade extra se necessário
          }));
          setSessoes(sessoesIniciais);
          console.log('✅ Sessões inicializadas com frentistas ativos');
        } else {
          setSessoes([]);
          console.log('✅ Sem envios e sem frentistas ativos');
        }
      }

      // [29/01 13:40] Atualiza contexto carregado
      ultimoContextoCarregado.current = {
        data,
        turno
      };
    } catch (err) {
      console.error('❌ Erro ao carregar sessões:', err);
      setSessoes([]);
    } finally {
      setCarregando(false);
    }
  }, [postoId]);

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

            // [18/01 00:00] Checar success do update (ApiResponse)
            // Motivo: Evitar sinalizar sucesso quando service retorna erro
            const updateRes = await fechamentoFrentistaService.update(Number(tempId.replace('existing-', '')), {
              observacoes: obsNova
            });

            if (!isSuccess(updateRes)) {
              console.error('❌ Erro ao persistir status:', updateRes.error);
              return;
            }

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
        cartao: acc.cartao + cartao,
        cartao_debito: acc.cartao_debito + debito,
        cartao_credito: acc.cartao_credito + credito,
        nota: acc.nota + nota,
        pix: acc.pix + pix,
        dinheiro: acc.dinheiro + dinheiro,
        baratao: acc.baratao + baratao,
        total: acc.total + cartao + nota + pix + dinheiro + baratao
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
