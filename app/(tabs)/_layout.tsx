import { Tabs } from 'expo-router';
import { ClipboardList, History, User, Home, ShoppingBag } from 'lucide-react-native';
import { View } from 'react-native';

export default function TabsLayout() {
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
                    paddingBottom: 8,
                    height: 70,
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
                name="vendas"
                options={{
                    title: 'Venda de Produtos',
                    tabBarLabel: 'Vendas',
                    tabBarIcon: ({ color, focused }) => (
                        <View className={`p-2 rounded-xl ${focused ? 'bg-primary-50' : ''}`}>
                            <ShoppingBag size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                        </View>
                    ),
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
            <Tabs.Screen
                name="index"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
