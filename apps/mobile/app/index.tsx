import { Redirect } from 'expo-router';

/**
 * Rota inicial do aplicativo.
 * Redireciona automaticamente para a área principal (tabs/registro).
 * Atualmente configurado para modo sem login obrigatório na entrada.
 * 
 * @component
 * @returns {JSX.Element} Redirecionamento para /(tabs)/registro.
 */
export default function Index() {
    // Redireciona automaticamente para a tela de registro (Modo sem Login)
    return <Redirect href="/(tabs)/registro" />;
}

