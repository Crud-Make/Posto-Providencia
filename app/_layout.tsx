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

    // Registrar push token quando o usuário está logado (nas tabs)
    useEffect(() => {
        async function initializePushNotifications() {
            // Só registra quando está nas tabs (logado)
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
            <StatusBar style="light" backgroundColor="#b91c1c" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="cadastrar" />
                <Stack.Screen name="(tabs)" />
            </Stack>
        </PostoProvider>
    );
}
