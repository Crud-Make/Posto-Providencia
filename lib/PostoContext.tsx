import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';
import { frentistaService, type Frentista, type Posto } from './api';

interface PostoContextType {
    postoAtivo: Posto | null;
    postoAtivoId: number | null;
    loading: boolean;
    error: string | null;
    refreshPosto: () => Promise<void>;
}

const PostoContext = createContext<PostoContextType | undefined>(undefined);

export const PostoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [postoAtivo, setPostoAtivo] = useState<Posto | null>(null);
    const [postoAtivoId, setPostoAtivoId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadPostoData = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                setPostoAtivo(null);
                setPostoAtivoId(null);
                setLoading(false);
                return;
            }

            // Buscar frentista para obter o posto_id
            const frentista = await frentistaService.getByUserId(session.user.id);

            if (frentista && frentista.posto_id) {
                setPostoAtivoId(frentista.posto_id);

                // Buscar detalhes do posto
                const { data: posto, error: postoError } = await supabase
                    .from('Posto')
                    .select('*')
                    .eq('id', frentista.posto_id)
                    .single();

                if (postoError) throw postoError;
                setPostoAtivo(posto);
            } else {
                setError('Frentista não vinculado a um posto ativo.');
            }
        } catch (err: any) {
            console.error('Erro ao carregar dados do posto:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPostoData();

        // Escutar mudanças na autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                loadPostoData();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        postoAtivo,
        postoAtivoId,
        loading,
        error,
        refreshPosto: loadPostoData
    };

    return (
        <PostoContext.Provider value={value}>
            {children}
        </PostoContext.Provider>
    );
};

export const usePosto = () => {
    const context = useContext(PostoContext);
    if (context === undefined) {
        throw new Error('usePosto deve ser usado dentro de um PostoProvider');
    }
    return context;
};
