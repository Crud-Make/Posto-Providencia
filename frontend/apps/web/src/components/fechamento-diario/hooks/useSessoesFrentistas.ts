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

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { SessaoFrentista } from '../../../types/fechamento';
import type { Frentista } from '../../../types/database/index';
import { fechamentoFrentistaService, frentistaService } from '../../../services/api';
import { paraReais, formatarValorSimples, formatarValorAoSair } from '../../../utils/formatters';
import { isSuccess } from '../../../types/ui/response-types';
import { cartao, conferido } from '@posto/utils';
import { meiosDaSessao } from '../../../utils/fechamentoMeios';

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
  moedas: number;
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
  carregarSessoes: (data: string, force?: boolean) => Promise<void>;
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
  valor_moedas: '',
  valor_baratao: '',
  valor_encerrante: '',
  valor_conferido: '',
  observacoes: '',
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
  // Chave por data E posto: trocar de posto com a mesma data batia no cache e
  // devolvia as sessões do posto anterior (achado de 19/08/2026).
  const ultimoContextoCarregado = useRef<{ data: string; postoId: number | null }>({
    data: '',
    postoId: null
  });
  // `frentistasCadastrados` chega como array novo a cada `carregarDados` — e
  // `carregarDados` roda em todo evento realtime de `Fechamento` (cada envio do
  // PWA consolida o pai). Com ele nas deps, `carregarSessoes` trocava de
  // identidade a cada envio, o que (1) derrubava e reassinava o canal realtime
  // de `FechamentoFrentista` em `index.tsx` bem na hora em que o filho era
  // inserido — o INSERT caía no buraco e o envio só aparecia no F5 — e
  // (2) redisparava o efeito de restauração do rascunho. Lendo por ref, a
  // função é estável e o canal fica de pé.
  const frentistasRef = useRef<Frentista[]>(frentistasCadastrados);
  useEffect(() => {
    frentistasRef.current = frentistasCadastrados;
  }, [frentistasCadastrados]);

  /**
   * Carrega sessões existentes do banco
   *
   * @param data - Data do fechamento
   */
  const carregarSessoes = useCallback(async (data: string, force = false) => {
    if (!postoId) return;

    // [29/01 13:40] Evita recarregar se já carregou para este contexto, a menos que seja forçado
    if (
      !force &&
      ultimoContextoCarregado.current.data === data &&
      ultimoContextoCarregado.current.postoId === postoId
    ) {
      return;
    }

    setCarregando(true);
    try {
      // O envio do frentista é por dia: `getByDate` carrega todos os envios da data.
      // [16/08] O parâmetro `turno` saiu — ele já não chegava à consulta, servia só ao
      // guard de cache acima, e mantê-lo dava a impressão de que a busca filtrava por turno.
      const dadosRes = await fechamentoFrentistaService.getByDate(
        data,
        postoId
      );

      if (!isSuccess(dadosRes)) {
        console.error('❌ Erro ao carregar sessões:', dadosRes.error);
        setSessoes([]);
        return;
      }

      const dados = dadosRes.data;

      // Obtemos frentistas ativos (independente se existem dados ou não)
      let frentistasAtivos: Frentista[] = [];
      const frentistasCadastradosAtuais = frentistasRef.current;
      if (frentistasCadastradosAtuais.length > 0) {
        frentistasAtivos = frentistasCadastradosAtuais.filter(f => f.ativo);
      } else {
        const frentistasRes = await frentistaService.getAll(postoId);
        if (isSuccess(frentistasRes)) {
          frentistasAtivos = frentistasRes.data.filter((f: Frentista) => f.ativo);
        }
      }

      if (dados.length > 0) {
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
          valor_moedas: paraReais(fs.valor_moedas ?? 0),
          valor_baratao: paraReais(fs.baratao ?? 0),
          valor_encerrante: paraReais(fs.encerrante ?? 0),
          valor_conferido: paraReais(fs.valor_conferido ?? 0),
          observacoes: fs.observacoes || '',
          // Não existe coluna `status` na tabela — o estado "conferido" é persistido como
          // marcador de texto dentro de `observacoes` (ver `atualizarSessao` abaixo e
          // `aggregator.service.ts` → `sessionStatus`, mesmo padrão). Reconstrói aqui pra não
          // perder o estado ao recarregar a tela.
          status: (fs.observacoes || '').includes('[CONFERIDO]') ? 'conferido' : 'pendente',
          // O banco devolve `null` quando o envio não veio do app; `SessaoFrentista` modela
          // essa ausência como campo opcional. Converter para `undefined` mantém o mesmo
          // comportamento de tela (ambos caem no ramo "—" de `EnviosMobile`) sem inventar data.
          // Mesmo tratamento já usado em `utils/fechamentoMeios.ts`.
          data_hora_envio: fs.data_hora_envio ?? undefined
        }));

        const frentistasEnviados = new Set(mapeadas.map(m => m.frentistaId));

        setSessoes(prevSessoes => {
          const mapPendentes = new Map();
          prevSessoes.forEach(s => {
            if (s.tempId.startsWith('temp-') && s.frentistaId) {
              mapPendentes.set(s.frentistaId, s);
            }
          });

          const sessoesExtras: SessaoFrentista[] = [];
          frentistasAtivos.forEach(f => {
            if (!frentistasEnviados.has(f.id)) {
              const sessaoLocal = mapPendentes.get(f.id);
              sessoesExtras.push(sessaoLocal ? sessaoLocal : { ...criarSessaoVazia(), frentistaId: f.id });
            }
          });

          return [...mapeadas, ...sessoesExtras];
        });

        console.log('[carregarSessoes] Mesclado dados do DB com rascunhos locais.');

      } else {
        // [20/01 11:55] Se não houver sessões salvas, carrega frentistas ativos
        // Motivo: Usuário deseja que os frentistas ativos apareçam automaticamente na nova tela

        if (frentistasAtivos.length > 0) {
          setSessoes(prevSessoes => {
            const mapPendentes = new Map();
            prevSessoes.forEach(s => {
              if (s.tempId.startsWith('temp-') && s.frentistaId) {
                mapPendentes.set(s.frentistaId, s);
              }
            });

            return frentistasAtivos.map(f => {
              const sessaoLocal = mapPendentes.get(f.id);
              return sessaoLocal ? sessaoLocal : { ...criarSessaoVazia(), frentistaId: f.id };
            });
          });
          console.log('✅ Sessões inicializadas/recuperadas com frentistas ativos');
        } else {
          setSessoes([]);
          console.log('✅ Sem envios e sem frentistas ativos');
        }
      }

      // [29/01 13:40] Atualiza contexto carregado
      ultimoContextoCarregado.current = {
        data,
        postoId
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
  const removerFrentista = useCallback(async (tempId: string) => {
    // Se for um registro que já existe no banco, exclui lá também
    if (tempId.startsWith('existing-')) {
      const id = parseInt(tempId.replace('existing-', ''), 10);
      try {
        const res = await fechamentoFrentistaService.delete(id);
        if (!isSuccess(res)) {
          console.error('❌ Erro ao excluir frentista no banco:', res.error);
        } else {
          console.log('✅ Frentista excluído do banco com sucesso');
        }
      } catch (err) {
        console.error('❌ Erro inesperado ao excluir frentista:', err);
      }
    }

    setSessoes(prev => prev.filter(s => s.tempId !== tempId));
    console.log('➖ Frentista removido da tela:', tempId);
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
      const m = meiosDaSessao(fs);
      return {
        cartao: acc.cartao + cartao(m), // aditivo: valor_cartao + débito + crédito
        cartao_debito: acc.cartao_debito + m.cartaoDebito,
        cartao_credito: acc.cartao_credito + m.cartaoCredito,
        nota: acc.nota + m.nota,
        pix: acc.pix + m.pix,
        dinheiro: acc.dinheiro + m.dinheiro,
        moedas: acc.moedas + m.moedas,
        baratao: acc.baratao + m.baratao,
        total: acc.total + conferido(m) // 7 buckets, cartão aditivo
      };
    }, { cartao: 0, cartao_debito: 0, cartao_credito: 0, nota: 0, pix: 0, dinheiro: 0, moedas: 0, baratao: 0, total: 0 });
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
