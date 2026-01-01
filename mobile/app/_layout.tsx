import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import "../global.css";
import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';

export default function RootLayout() {
    useEffect(() => {
        async function checkUpdates() {
            try {
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                    await Updates.fetchUpdateAsync();
                    Alert.alert('Atualização Disponível', 'Reiniciando para aplicar nova versão...', [
                        { text: 'OK', onPress: () => Updates.reloadAsync() }
                    ]);
                }
            } catch (e) {
                // Silently fail or log
                console.log('Erro update auto:', e);
            }
        }
        checkUpdates();
    }, []);

    return (
        <>
            <StatusBar style="light" backgroundColor="#b91c1c" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
            </Stack>
        </>
    );
}
