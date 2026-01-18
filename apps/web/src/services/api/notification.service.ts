import { supabase } from '../supabase';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

export interface PushToken {
  id: number;
  frentista_id: number;
  expo_push_token: string;
  ativo: boolean;
  created_at?: string;
}

export interface NotificationData {
  frentista_id: number;
  fechamento_frentista_id?: number;
  titulo: string;
  mensagem: string;
  tipo: string;
  valor_falta?: number;
}

export interface Notificacao {
  id: number;
  frentista_id: number;
  fechamento_frentista_id?: number;
  titulo: string;
  mensagem: string;
  tipo: string;
  valor_falta?: number;
  lida: boolean;
  enviada: boolean;
  data_envio?: string;
  created_at: string;
}

/**
 * Serviço de Notificações
 * 
 * @remarks
 * Gerencia notificações push para frentistas (falta de caixa, avisos, etc)
 */
export const notificationService = {
  /**
   * Busca tokens de push ativos para um frentista
   * @param frentistaId - ID do frentista
   */
  async getTokensByFrentistaId(frentistaId: number): Promise<ApiResponse<string[]>> {
    try {
      const { data, error } = await supabase
        .from('PushToken')
        .select('expo_push_token')
        .eq('frentista_id', frentistaId)
        .eq('ativo', true);

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse(data?.map((t: { expo_push_token: string }) => t.expo_push_token) || []);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria uma notificação no banco de dados
   * @param data - Dados da notificação
   */
  async createNotification(data: NotificationData): Promise<ApiResponse<number | null>> {
    try {
      const { data: notification, error } = await supabase
        .from('Notificacao')
        .insert({
          frentista_id: data.frentista_id,
          fechamento_frentista_id: data.fechamento_frentista_id,
          titulo: data.titulo,
          mensagem: data.mensagem,
          tipo: data.tipo,
          valor_falta: data.valor_falta,
        })
        .select('id')
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');

      return createSuccessResponse(notification?.id || null);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Envia push notification via Expo Push API
   * @param expoPushTokens - Lista de tokens para envio
   * @param titulo - Título da notificação
   * @param mensagem - Corpo da notificação
   * @param data - Dados adicionais opcionais
   */
  async sendPushNotification(
    expoPushTokens: string[],
    titulo: string,
    mensagem: string,
    data?: Record<string, unknown>
  ): Promise<ApiResponse<boolean>> {
    try {
      if (expoPushTokens.length === 0) {
        console.log('Nenhum token disponível para envio');
        return createSuccessResponse(false);
      }

      const messages = expoPushTokens.map(token => ({
        to: token,
        sound: 'default' as const,
        title: titulo,
        body: mensagem,
        data: data || {},
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log('Push notification enviada:', result);
      return createSuccessResponse(true);
    } catch (err) {
      console.error('Erro ao enviar push notification:', err);
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Notifica frentista sobre falta de caixa
   * @param frentistaId - ID do frentista
   * @param fechamentoFrentistaId - ID do fechamento
   * @param valorFalta - Valor da falta
   */
  async sendFaltaCaixaNotification(
    frentistaId: number,
    fechamentoFrentistaId: number,
    valorFalta: number
  ): Promise<ApiResponse<boolean>> {
    try {
      const titulo = '⚠️ Falta de Caixa';
      const mensagem = `Faltou R$ ${valorFalta.toFixed(2).replace('.', ',')} no seu fechamento de caixa.`;

      // 1. Criar registro no banco
      const notificationResult = await this.createNotification({
        frentista_id: frentistaId,
        fechamento_frentista_id: fechamentoFrentistaId,
        titulo,
        mensagem,
        tipo: 'FALTA_CAIXA',
        valor_falta: valorFalta,
      });

      if (!notificationResult.success || !notificationResult.data) {
        return createErrorResponse('Falha ao criar notificação no banco', 'INSERT_ERROR');
      }

      const notificationId = notificationResult.data;

      // 2. Buscar tokens do frentista
      const tokensResult = await this.getTokensByFrentistaId(frentistaId);
      const tokens = tokensResult.success ? tokensResult.data : [];

      if (tokens.length === 0) {
        console.log('Frentista não possui dispositivos registrados');
        return createSuccessResponse(true); // Notificação criada, mas sem push
      }

      // 3. Enviar push
      const sentResult = await this.sendPushNotification(tokens, titulo, mensagem, {
        type: 'FALTA_CAIXA',
        fechamentoFrentistaId,
        valorFalta,
      });

      // 4. Atualizar status de envio
      if (sentResult.success && sentResult.data) {
        await supabase
          .from('Notificacao')
          .update({
            enviada: true,
            data_envio: new Date().toISOString(),
          })
          .eq('id', notificationId);
      }

      return createSuccessResponse(sentResult.success && sentResult.data);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Busca todas as notificações de um frentista
   * @param frentistaId - ID do frentista
   */
  async getByFrentistaId(frentistaId: number): Promise<ApiResponse<Notificacao[]>> {
    try {
      const { data, error } = await supabase
        .from('Notificacao')
        .select('*')
        .eq('frentista_id', frentistaId)
        .order('created_at', { ascending: false });

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data as Notificacao[]) || []);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Marca notificação como lida
   * @param notificationId - ID da notificação
   */
  async markAsRead(notificationId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('Notificacao')
        .update({ lida: true })
        .eq('id', notificationId);

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

