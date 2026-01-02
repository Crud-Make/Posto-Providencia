import { Tabs } from 'expo-router';
import { ClipboardList, History, User, QrCode } from 'lucide-react-native';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    // Add extra padding on Android with edge-to-edge to avoid overlap with navigation buttons
    const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#b91c1c',
                tabBarInactiveTintColor: '#9ca3af',
                headerShown: true,
                headerStyle: {
                    backgroundColor: '#b91c1c',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#f3f4f6',
                    paddingTop: 8,
                    paddingBottom: bottomPadding + 8,
                    height: 70 + bottomPadding,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="registro"
                options={{
                    title: 'Registro de Turno',
                    tabBarLabel: 'Registro',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={`p-2 rounded-xl ${focused ? 'bg-primary-50' : ''}`}>
                            <ClipboardList size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="voucher"
                options={{
                    title: 'Voucher Baratência',
                    tabBarLabel: 'Voucher',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={`p-2 rounded-xl ${focused ? 'bg-purple-50' : ''}`}>
                            <QrCode size={24} color={focused ? '#7c3aed' : color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                    tabBarActiveTintColor: '#7c3aed',
                }}
            />
            <Tabs.Screen
                name="historico"
                options={{
                    title: 'Histórico',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={`p-2 rounded-xl ${focused ? 'bg-primary-50' : ''}`}>
                            <History size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="perfil"
                options={{
                    title: 'Meu Perfil',
                    tabBarLabel: 'Perfil',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={`p-2 rounded-xl ${focused ? 'bg-primary-50' : ''}`}>
                            <User size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}
