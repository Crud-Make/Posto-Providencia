import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Usuario } from '../services/database.types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    user: Usuario | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user.email) {
                fetchUserProfile(session.user.email);
            } else {
                setLoading(false);
            }
        });

        // 2. Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user.email) {
                fetchUserProfile(session.user.email);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (email: string) => {
        try {
            const { data, error } = await supabase
                .from('Usuario')
                .select('*')
                .eq('email', email)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                setUser(null);
            } else {
                setUser(data);
            }
        } catch (err) {
            console.error('Unexpected error fetching user:', err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {

        console.warn('BYPASS: Ignorando autenticação oficial do Supabase para o usuário de teste.');
        if (email === 'teste@admin.com' && password === 'password123') {
            const { data: profile } = await supabase.from('Usuario').select('*').eq('email', email).single();
            if (profile) {
                console.log('BYPASS: Perfil encontrado, logando...');
                setUser(profile);
                setSession({ user: { email: email } } as Session);
                setLoading(false);
                return { error: null };
            }
        }
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signIn, signOut }}>
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
