import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'web') {
        return null;
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            alert('Falha ao obter permissão para notificações!');
            return null;
        }

        // O projectId é necessário para o Expo Notifications
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId;

        try {
            token = (await Notifications.getExpoPushTokenAsync({
                projectId,
            })).data;
            console.log('Push Token Gerado:', token);
        } catch (e) {
            console.error('Erro ao gerar push token:', e);
            return null;
        }
    } else {
        console.log('Notificações físicas não disponíveis em simuladores');
    }

    return token;
}

export async function savePushToken(frentistaId: number, userId: number, token: string) {
    try {
        const deviceInfo = `${Device.brand} ${Device.modelName} (${Platform.OS})`;

        // Verifica se o token já existe para este frentista
        const { data: existing } = await supabase
            .from('PushToken')
            .select('id')
            .eq('expo_push_token', token)
            .eq('frentista_id', frentistaId)
            .single();

        if (existing) {
            // Atualiza o status para ativo
            await supabase
                .from('PushToken')
                .update({
                    ativo: true,
                    updated_at: new Date().toISOString(),
                    usuario_id: userId
                })
                .eq('id', existing.id);
        } else {
            // Cria novo registro
            await supabase
                .from('PushToken')
                .insert({
                    frentista_id: frentistaId,
                    usuario_id: userId,
                    expo_push_token: token,
                    device_info: deviceInfo,
                    ativo: true
                });
        }

        console.log('Push Token salvo com sucesso no banco');
    } catch (error) {
        console.error('Erro ao salvar push token no banco:', error);
    }
}
