/**
 * Contexto de Autenticação
 * @module AuthContext
 * @description Gerencia estado de autenticação e sessão do usuário
 * @remarks Utiliza mock user por padrão para modo desenvolvimento sem login
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { UsuarioTable } from '../types/database/tables/infraestrutura';
import { Session } from '@supabase/supabase-js';
import { AuthResponse } from '../types/supabase-errors';

/**
 * Tipo de usuário baseado no schema do banco de dados
 * @typedef {UsuarioTable['Row']} Usuario
 */
type Usuario = UsuarioTable['Row'];

/**
 * Interface do Contexto de Autenticação
 * @interface AuthContextType
 */
interface AuthContextType {
    /** Sessão atual do Supabase */
    session: Session | null;
    /** Dados do usuário logado */
    user: Usuario | null;
    /** Estado de carregamento */
    loading: boolean;
    /** Função de login */
    signIn: (email: string, password: string) => Promise<AuthResponse>;
    /** Função de registro */
    signUp: (email: string, password: string, fullName: string) => Promise<AuthResponse>;
    /** Função de logout */
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// [29/01 13:30] MOCK user para desenvolvimento sem autenticação obrigatória
const MOCK_ADMIN_USER: Usuario = {
    id: 1,
    nome: 'Administrador',
    email: 'admin@postoprovidencia.com',
    role: 'ADMIN',
    ativo: true,
    senha: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

/**
 * Provider de Autenticação
 * @param children - Componentes filhos que terão acesso ao contexto
 * @returns JSX.Element - Provider com contexto de autenticação
 * @remarks Inicializa com MOCK_ADMIN_USER para desenvolvimento
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<Usuario | null>(MOCK_ADMIN_USER); // [29/01 13:35] Usuário mock como padrão
    const [loading, setLoading] = useState(false); // [29/01 13:35] Sem loading pois temos mock user

    useEffect(() => {
        // [29/01 13:35] Mantém verificação de auth em background caso usuário faça login real
        // ou se quisermos voltar facilmente depois
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user.email) {
                setSession(session);
                fetchUserProfile(session.user.email);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user.email) {
                setSession(session);
                fetchUserProfile(session.user.email);
            } else {
                // [29/01 13:35] Retorna ao mock user ao fazer logout
                setSession(null);
                setUser(MOCK_ADMIN_USER);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    /**
     * Busca o perfil do usuário no banco de dados
     * @param email - Email do usuário para buscar
     * @returns Promise<void>
     * @remarks Fallback para MOCK_ADMIN_USER em caso de erro
     */
    const fetchUserProfile = async (email: string): Promise<void> => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('Usuario')
                .select('*')
                .eq('email', email)
                .single();

            if (error) {
                console.error('Erro ao buscar perfil do usuário:', error);
                setUser(MOCK_ADMIN_USER);
                return;
            }

            if (data) {
                setUser(data as Usuario);
            } else {
                console.warn('Usuário não encontrado no banco de dados');
                setUser(MOCK_ADMIN_USER);
            }
        } catch (err) {
            console.error('Erro inesperado ao buscar usuário:', err);
            setUser(MOCK_ADMIN_USER);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Realiza login do usuário
     * @param email - Email do usuário
     * @param password - Senha do usuário
     * @returns Promise<AuthResponse> - Resposta com erro se houver
     */
    const signIn = async (email: string, password: string): Promise<AuthResponse> => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    /**
     * Registra um novo usuário
     * @param email - Email do novo usuário
     * @param password - Senha do novo usuário
     * @param fullName - Nome completo do usuário
     * @returns Promise<AuthResponse> - Resposta com erro se houver
     * @remarks A senha é gerenciada pelo Supabase Auth, não armazenada na tabela Usuario
     */
    const signUp = async (email: string, password: string, fullName: string): Promise<AuthResponse> => {
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpError) return { error: signUpError };

        const { error: profileError } = await supabase
            .from('Usuario')
            .upsert([
                {
                    email,
                    nome: fullName,
                    senha: '',
                    ativo: true,
                    role: 'ADMIN'
                }
            ], { onConflict: 'email' });

        return { error: profileError };
    };

    /**
     * Realiza logout do usuário
     * @returns Promise<void>
     * @remarks Retorna ao MOCK_ADMIN_USER após logout
     */
    const signOut = async (): Promise<void> => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(MOCK_ADMIN_USER);
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Hook para acessar o contexto de autenticação
 * @returns AuthContextType - Contexto de autenticação com session, user, loading e funções
 * @throws Error - Se usado fora do AuthProvider
 * @example
 * const { user, signIn, signOut } = useAuth();
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};
