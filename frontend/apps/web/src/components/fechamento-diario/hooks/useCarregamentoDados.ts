/**
 * Hook para gerenciamento de carregamento de dados gerais
 *
 * @remarks
 * Centraliza carregamento de bicos e frentistas
 * e configuração de realtime subscriptions do Supabase
 *
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

// [20/01 10:00] Adição de updateBicoPrice para edição local de preços
// Motivo: Permitir ajuste rápido de preço durante o fechamento sem alterar cadastro
// [19/08] Preço editado passa a viver em `useEstadoPersistido`, indexado por
// (data, bico), em vez de mutar `bicos` direto num useRef.
// Motivo: duas falhas reais. (1) navegar para outra tela desmontava o
// componente, o useRef morria e a edição sumia — reabrir a tela voltava pro
// preço de hoje. (2) o preço editado não sabia a qual dia pertencia: trocar
// de data sem desmontar deixava o preço de um dia vazar pro outro. Guardar em
// sessionStorage, com a data na chave, resolve os dois — sobrevive à troca de
// tela e nunca aparece no dia errado.
import { useState, useCallback, useEffect, useMemo } from 'react';
import type { BicoComDetalhes } from '../../../types/fechamento';
import type { Frentista } from '../../../types/database/index';
import { bicoService, frentistaService } from '../../../services/api';
import { descreverErroDaApi, urlDaApi } from '../../../services/api/base';
import { lerBicosComDetalhesDaApi } from '../../../services/api/bico.api';
import { lerFrentistasDaApi } from '../../../services/api/frentista.api';
import { supabase } from '../../../services/supabase';
import {
  type ApiResponse,
  createErrorResponse,
  createSuccessResponse,
  isSuccess
} from '../../../types/ui/response-types';
import { useEstadoPersistido } from '../../../shared/lib/estado-persistido';

/**
 * Retorno do hook useCarregamentoDados
 */
interface RetornoCarregamentoDados {
  bicos: BicoComDetalhes[];
  frentistas: Frentista[];
  carregando: boolean;
  erro: string | null;
  carregarDados: () => Promise<void>;
  updateBicoPrice: (bicoId: number, newPrice: number, modo?: ModoPreco) => void;
}

/**
 * Como `updateBicoPrice` trata um preço já editado para (data, bico):
 * 'sobrescrever' é a digitação do gerente e o preço carimbado numa leitura SALVA;
 * 'se-vazio' é a herança do dia anterior, que nunca pisa no que foi digitado.
 */
export type ModoPreco = 'sobrescrever' | 'se-vazio';

const chavePrecoEditado = (data: string, bicoId: number): string => `${data}:${bicoId}`;

/**
 * Hook customizado para carregamento de dados do fechamento
 *
 * @param postoId - ID do posto ativo
 * @param dataSelecionada - Data do fechamento em edição, usada para isolar o preço editado por dia
 * @returns Dados carregados e funções de controle
 *
 * @remarks
 * - Carrega bicos e frentistas em paralelo
 * - Configura realtime subscription para atualizações
 *
 * @example
 * const { bicos, frentistas, carregarDados } = useCarregamentoDados(postoId, dataSelecionada);
 */
export const useCarregamentoDados = (
  postoId: number | null,
  dataSelecionada?: string
): RetornoCarregamentoDados => {
  const [bicosCadastro, setBicosCadastro] = useState<BicoComDetalhes[]>([]);
  const [frentistas, setFrentistas] = useState<Frentista[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // 'permanente': o preço é rascunho DIGITADO, e a chave já carrega a data, então
  // não vaza entre dias. Fechar a aba não pode apagar o que ainda não foi salvo —
  // ao contrário da data selecionada, que morre de propósito. Ver DuracaoEstado.
  const [precosEditados, definirPrecosEditados] = useEstadoPersistido<Record<string, number>>(
    'fechamento:precos-editados',
    () => ({}),
    'permanente'
  );

  /**
   * Bicos exibidos na tela: cadastro puro, com o preço do dia sobreposto
   * quando há edição salva para (dataSelecionada, bicoId). Recalcula sozinho
   * a cada recarga de cadastro, troca de data ou nova edição — sem precisar
   * de nenhum código que "reaplique" o preço na mão.
   */
  const bicos = useMemo(() => {
    if (!dataSelecionada) return bicosCadastro;
    return bicosCadastro.map(bico => {
      const preco = precosEditados[chavePrecoEditado(dataSelecionada, bico.id)];
      return preco === undefined
        ? bico
        : { ...bico, combustivel: { ...bico.combustivel, preco_venda: preco } };
    });
  }, [bicosCadastro, dataSelecionada, precosEditados]);

  /**
   * Atualiza o preço de um bico para o dia selecionado.
   *
   * @param bicoId - ID do bico a ser atualizado
   * @param newPrice - Novo preço a ser aplicado
   *
   * @remarks
   * Usado tanto pela edição manual na tabela quanto pela restauração do preço
   * carimbado de uma leitura já salva (`aoRestaurarPrecoDoDia` em
   * `useLeituras`) — os dois escrevem no mesmo lugar, então o mais recente
   * sempre vence.
   */
  const updateBicoPrice = useCallback((bicoId: number, newPrice: number, modo: ModoPreco = 'sobrescrever') => {
    if (!dataSelecionada) return;
    // Forma de função: aplicar preço em vários bicos de uma vez (preço por
    // combustível) chama isto em sequência síncrona dentro do mesmo evento —
    // ler `precosEditados` direto da closure faria a 2ª chamada pisar na 1ª,
    // porque as duas partiriam do mesmo estado "antigo". Ver useEstadoPersistido.
    definirPrecosEditados(atual => {
      const chave = chavePrecoEditado(dataSelecionada, bicoId);
      // 'se-vazio' é a herança do dia anterior num dia ainda sem leitura: ela
      // só preenche o que o gerente NÃO digitou. Sem isto, cada recarga (abrir a
      // aba de novo, realtime de uma leitura de outro dia) devolvia o preço
      // herdado por cima do rascunho digitado — e o 'permanente' do rascunho
      // não servia para nada.
      if (modo === 'se-vazio' && atual[chave] !== undefined) return atual;
      return { ...atual, [chave]: newPrice };
    });
  }, [dataSelecionada, definirPrecosEditados]);

  /**
   * Carrega todos os dados necessários do posto
   */
  const carregarDados = useCallback(async () => {
    if (!postoId) return;

    setCarregando(true);
    setErro(null);

    try {
      // Carrega em paralelo para melhor performance
      // [18/01 00:00] Checar success e extrair data do ApiResponse
      // Motivo: services agora retornam ApiResponse
      // [19/09] Bicos e frentistas pela API Laravel (#97) quando VITE_API_URL existe; sem
      // ela, nada muda. A troca é AQUI, no call site, e não dentro de
      // `bicoService.getWithDetails` / `frentistaService.getAll`: o `aggregator.service.ts`
      // (:352, :420) chama os mesmos métodos, e o aggregator é sítio de fórmula que só o
      // Fable edita (Design Doc fechamento-diario-api.md §2). O filtro de `ativo` é do
      // cliente, porque `CatalogoDoPosto` não filtra e o Supabase filtrava
      // (`bico.service.ts:52`, `frentista.service.ts:51`). `preco_venda` chega da API como
      // string decimal e já vem convertido em `bico.api.ts`; a sobreposição por
      // `precosEditados` (acima) continua igual para as duas fontes.
      const viaApi = urlDaApi() !== null;
      const bicosPromise: Promise<ApiResponse<BicoComDetalhes[]>> = viaApi
        ? lerBicosComDetalhesDaApi(postoId).match(
            (bicosLidos) => createSuccessResponse(bicosLidos),
            (erro) => createErrorResponse(descreverErroDaApi(erro), 'FETCH_ERROR')
          )
        : bicoService.getWithDetails(postoId);
      const frentistasPromise: Promise<ApiResponse<Frentista[]>> = viaApi
        ? lerFrentistasDaApi(postoId).match(
            (frentistas) => createSuccessResponse(frentistas),
            (erro) => createErrorResponse(descreverErroDaApi(erro), 'FETCH_ERROR')
          )
        : frentistaService.getAll(postoId);

      const [dadosBicosRes, dadosFrentistasRes] = await Promise.all([bicosPromise, frentistasPromise]);

      const erros: string[] = [];
      if (!isSuccess(dadosBicosRes)) {
        erros.push(dadosBicosRes.error);
        setBicosCadastro([]);
      } else {
        setBicosCadastro(dadosBicosRes.data);
      }

      if (!isSuccess(dadosFrentistasRes)) {
        erros.push(dadosFrentistasRes.error);
        setFrentistas([]);
      } else {
        setFrentistas(dadosFrentistasRes.data);
      }

      if (erros.length > 0) {
        setErro(erros[0]);
        console.error('❌ Erro ao carregar dados do posto:', erros.join(' | '));
        return;
      }

      console.log('✅ Dados carregados com sucesso');
    } catch (err) {
      const mensagemErro = 'Erro ao carregar dados do posto';
      setErro(mensagemErro);
      console.error('❌', mensagemErro, err);
    } finally {
      setCarregando(false);
    }
  }, [postoId]);

  /**
   * Configura realtime subscription para mudanças no banco
   *
   * @remarks
   * Escuta mudanças na tabela de fechamentos e recarrega
   * dados automaticamente quando necessário
   */
  useEffect(() => {
    if (!postoId) return;

    const canal = supabase
      .channel(`fechamento-${postoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Fechamento',
          filter: `posto_id=eq.${postoId}`
        },
        () => {
          console.log('🔄 Detectada mudança no banco, recarregando...');
          carregarDados();
        }
      )
      .subscribe();

    // Cleanup ao desmontar
    return () => {
      canal.unsubscribe();
    };
  }, [postoId, carregarDados]);

  return {
    bicos,
    frentistas,
    carregando,
    erro,
    carregarDados,
    updateBicoPrice
  };
};
