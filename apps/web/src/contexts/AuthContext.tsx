import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Usuario } from '../types/database/index';
import { Session } from '@supabase/supabase-js';
import { AuthResponse } from '../types/supabase-errors';

interface AuthContextType {
    session: Session | null;
    user: Usuario | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<AuthResponse>;
    signUp: (email: string, password: string, fullName: string) => Promise<AuthResponse>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// MOCK USER for "No Login Needed" mode
const MOCK_ADMIN_USER: Usuario = {
    id: 999,
    nome: 'Administrador (Auto)',
    email: 'admin@postoprovidencia.com.br',
    role: 'ADMIN',
    ativo: true,
    senha: '', // Required by schema but never exposed
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<Usuario | null>(MOCK_ADMIN_USER); // Default to mock user
    const [loading, setLoading] = useState(false); // No loading since we have a mock user

    useEffect(() => {
        // We keep the background auth check just in case the user actually signs in
        // or if we want to switch back easily later.
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
                // Return to mock user on sign out
                setSession(null);
                setUser(MOCK_ADMIN_USER);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (email: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('Usuario')
                .select('*')
                .eq('email', email)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                // Keep mock user on error
                setUser(MOCK_ADMIN_USER);
                return;
            }

            if (data) {
                setUser(data);
            } else {
                console.warn('User not found in database');
                setUser(MOCK_ADMIN_USER);
            }
        } catch (err) {
            console.error('Unexpected error fetching user:', err);
            setUser(MOCK_ADMIN_USER);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpError) return { error: signUpError };

        // Note: Password is managed by Supabase Auth, not stored in Usuario table
        // The 'senha' field in Usuario table should be removed from the schema
        const { error: profileError } = await supabase
            .from('Usuario')
            .upsert([
                {
                    email,
                    nome: fullName,
                    senha: '', // Empty string as placeholder - should be removed from schema
                    ativo: true,
                    role: 'ADMIN'
                }
            ], { onConflict: 'email' });

        return { error: profileError };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(MOCK_ADMIN_USER); // Go back to default mock
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
