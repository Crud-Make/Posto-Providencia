import { Redirect } from 'expo-router';

/**
 * Rota index das abas.
 * Redireciona automaticamente para a aba de registro (home).
 * 
 * @component
 * @returns {JSX.Element} Redirecionamento para /registro.
 */
export default function TabIndex() {
    return <Redirect href="/(tabs)/registro" />;
}
