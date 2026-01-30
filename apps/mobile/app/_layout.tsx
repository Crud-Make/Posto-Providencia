/**
 * RootLayout - Layout principal do aplicativo
 * 
 * FUNCIONALIDADES:
 * - Gerenciamento de navegação (expo-router)
 * - Push notifications
 * - Contexto do Posto (PostoProvider)
 * - Sistema de atualizações OTA automáticas (v1.4.0)
 * 
 * @version 1.4.0
 */
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import {
    registerForPushNotificationsAsync,
    savePushToken,
    setupNotificationListeners
} from '../lib/notifications';
import { supabase } from '../lib/supabase';
import { PostoProvider } from '../lib/PostoContext';
import { UpdateBanner } from '../lib/useUpdateChecker';
import "../global.css";

export default function RootLayout() {
    const notificationListener = useRef<(() => void) | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        // Configurar listeners de notificação
        const cleanup = setupNotificationListeners(
            (notification) => {
                console.log('Notificação recebida em foreground:', notification);
            },
            (response) => {
                console.log('Usuário interagiu com notificação:', response);
                // Aqui você pode navegar para uma tela específica baseado na notificação
            }
        );
        notificationListener.current = cleanup;

        return () => {
            if (notificationListener.current) {
                notificationListener.current();
            }
        };
    }, []);

    // Registrar push token (opcional no modo sem login)
    useEffect(() => {
        async function initializePushNotifications() {
            // No modo sem login, poderíamos registrar o token sem sessão se quisermos enviar por dispositivo
            // Por enquanto, apenas evitamos erros se não houver sessão
            if (pathname.includes('(tabs)')) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const token = await registerForPushNotificationsAsync();
                    if (token) {
                        await savePushToken(token);
                    }
                }
            }
        }
        initializePushNotifications();
    }, [pathname]);

    return (
        <PostoProvider>
            {/* Sistema de Atualizações OTA - Instant Reload
              * Verifica automaticamente por atualizações ao abrir o app
              * e quando o app volta ao foreground. Mostra prompt ao usuário
              * quando uma atualização está pronta para ser aplicada.
              */}
            <UpdateBanner />

            <StatusBar style="light" backgroundColor="#b91c1c" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="cadastrar" />
                <Stack.Screen name="(tabs)" />
            </Stack>
        </PostoProvider>
    );
}
