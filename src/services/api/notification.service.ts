import { supabase } from '../supabase';

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

export const notificationService = {
  /**
   * Busca tokens de push ativos para um frentista
   * @param frentistaId ID do frentista
   * @returns Lista de tokens Expo Push
   */
  async getTokensByFrentistaId(frentistaId: number): Promise<string[]> {
    const { data, error } = await supabase
      .from('PushToken')
      .select('expo_push_token')
      .eq('frentista_id', frentistaId)
      .eq('ativo', true);

    if (error) {
      console.error('Erro ao buscar tokens:', error);
      return [];
    }

    return data?.map((t: { expo_push_token: string }) => t.expo_push_token) || [];
  },

  /**
   * Cria uma notificação no banco de dados
   * @param data Dados da notificação
   * @returns ID da notificação criada ou null em caso de erro
   */
  async createNotification(data: NotificationData): Promise<number | null> {
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

    if (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }

    return notification?.id || null;
  },

  /**
   * Envia push notification via Expo Push API
   * @param expoPushTokens Lista de tokens para envio
   * @param titulo Título da notificação
   * @param mensagem Corpo da notificação
   * @param data Dados adicionais opcionais
   * @returns True se enviado com sucesso (pelo menos a requisição), False caso contrário
   */
  async sendPushNotification(
    expoPushTokens: string[],
    titulo: string,
    mensagem: string,
    data?: Record<string, unknown>
  ): Promise<boolean> {
    if (expoPushTokens.length === 0) {
      console.log('Nenhum token disponível para envio');
      return false;
    }

    const messages = expoPushTokens.map(token => ({
      to: token,
      sound: 'default' as const,
      title: titulo,
      body: mensagem,
      data: data || {},
    }));

    try {
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
      return true;
    } catch (error) {
      console.error('Erro ao enviar push notification:', error);
      return false;
    }
  },

  /**
   * Notifica frentista sobre falta de caixa
   * @param frentistaId ID do frentista
   * @param fechamentoFrentistaId ID do fechamento
   * @param valorFalta Valor da falta
   * @returns True se processado com sucesso
   */
  async sendFaltaCaixaNotification(
    frentistaId: number,
    fechamentoFrentistaId: number,
    valorFalta: number
  ): Promise<boolean> {
    const titulo = '⚠️ Falta de Caixa';
    const mensagem = `Faltou R$ ${valorFalta.toFixed(2).replace('.', ',')} no seu fechamento de caixa.`;

    // 1. Criar registro no banco
    const notificationId = await this.createNotification({
      frentista_id: frentistaId,
      fechamento_frentista_id: fechamentoFrentistaId,
      titulo,
      mensagem,
      tipo: 'FALTA_CAIXA',
      valor_falta: valorFalta,
    });

    if (!notificationId) {
      console.error('Falha ao criar notificação no banco');
      return false;
    }

    // 2. Buscar tokens do frentista
    const tokens = await this.getTokensByFrentistaId(frentistaId);

    if (tokens.length === 0) {
      console.log('Frentista não possui dispositivos registrados');
      // Atualizar notificação como não enviada (já é o padrão)
      return true; // Notificação criada, mas sem push
    }

    // 3. Enviar push
    const sent = await this.sendPushNotification(tokens, titulo, mensagem, {
      type: 'FALTA_CAIXA',
      fechamentoFrentistaId,
      valorFalta,
    });

    // 4. Atualizar status de envio
    if (sent) {
      await supabase
        .from('Notificacao')
        .update({
          enviada: true,
          data_envio: new Date().toISOString(),
        })
        .eq('id', notificationId);
    }

    return sent;
  },

  /**
   * Busca todas as notificações de um frentista
   * @param frentistaId ID do frentista
   * @returns Lista de notificações
   */
  async getByFrentistaId(frentistaId: number): Promise<Notificacao[]> {
    const { data, error } = await supabase
      .from('Notificacao')
      .select('*')
      .eq('frentista_id', frentistaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }

    return (data as Notificacao[]) || [];
  },

  /**
   * Marca notificação como lida
   * @param notificationId ID da notificação
   */
  async markAsRead(notificationId: number): Promise<void> {
    await supabase
      .from('Notificacao')
      .update({ lida: true })
      .eq('id', notificationId);
  },
};
