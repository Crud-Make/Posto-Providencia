import React, { createContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import type { Posto } from '../types/database/index';

// ============================================
// TYPES
// ============================================

export interface PostoContextType {
    postos: Posto[];
    postoAtivo: Posto | null;
    postoAtivoId: number;
    loading: boolean;
    error: string | null;
    setPostoAtivo: (posto: Posto) => void;
    setPostoAtivoById: (id: number) => void;
    refreshPostos: () => Promise<void>;
}

// ============================================
// DEFAULT VALUES
// ============================================

const defaultContext: PostoContextType = {
    postos: [],
    postoAtivo: null,
    postoAtivoId: 1, // Default: Posto Providência
    loading: true,
    error: null,
    setPostoAtivo: () => { },
    setPostoAtivoById: () => { },
    refreshPostos: async () => { },
};

// ============================================
// CONTEXT
// ============================================

const PostoContext = createContext<PostoContextType>(defaultContext);

// ============================================
// PROVIDER
// ============================================

interface PostoProviderProps {
    children: ReactNode;
}

export const PostoProvider: React.FC<PostoProviderProps> = ({ children }) => {
    const [postos, setPostos] = useState<Posto[]>([]);
    const [postoAtivo, setPostoAtivoState] = useState<Posto | null>(null);
    const [postoAtivoId, setPostoAtivoId] = useState<number>(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Guarda se o posto ativo padrão já foi definido, sem precisar ler `postoAtivo`
    // no closure de fetchPostos (evita recriar a função a cada mudança de estado
    // e, com isso, evita loop no useEffect abaixo que depende de fetchPostos).
    const postoAtivoDefinidoRef = useRef(false);

    // Carregar postos do banco de dados
    const fetchPostos = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('Posto')
                .select('*')
                .eq('ativo', true)
                .order('id', { ascending: true });

            if (fetchError) {
                throw fetchError;
            }

            const postosData = (data || []) as Posto[];
            setPostos(postosData);

            // Se não houver posto ativo, selecionar o primeiro
            if (postosData.length > 0 && !postoAtivoDefinidoRef.current) {
                postoAtivoDefinidoRef.current = true;

                // Verificar se há um posto salvo no localStorage
                const savedPostoId = localStorage.getItem('postoAtivoId');
                const defaultPosto = savedPostoId
                    ? postosData.find((p) => p.id === parseInt(savedPostoId, 10)) || postosData[0]
                    : postosData[0];

                setPostoAtivoState(defaultPosto);
                setPostoAtivoId(defaultPosto.id);
            }
        } catch (err) {
            console.error('Erro ao carregar postos:', err);
            setError('Não foi possível carregar os postos.');

            // Fallback: criar posto padrão para não quebrar o sistema
            const fallbackPosto: Posto = {
                id: 1,
                nome: 'Posto Providência',
                cnpj: null,
                endereco: null,
                cidade: 'Jorro',
                estado: 'BA',
                telefone: null,
                email: null,
                ativo: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            postoAtivoDefinidoRef.current = true;
            setPostos([fallbackPosto]);
            setPostoAtivoState(fallbackPosto);
            setPostoAtivoId(1);
        } finally {
            setLoading(false);
        }
    }, []);

    // Carregar postos na inicialização
    useEffect(() => {
        fetchPostos();
    }, [fetchPostos]);

    // Função para definir posto ativo
    const setPostoAtivo = (posto: Posto) => {
        setPostoAtivoState(posto);
        setPostoAtivoId(posto.id);
        localStorage.setItem('postoAtivoId', posto.id.toString());
    };

    // Função para definir posto ativo por ID
    const setPostoAtivoById = (id: number) => {
        const posto = postos.find((p) => p.id === id);
        if (posto) {
            setPostoAtivo(posto);
        }
    };

    // Função para recarregar postos
    const refreshPostos = async () => {
        await fetchPostos();
    };

    // Valor do contexto
    const value: PostoContextType = {
        postos,
        postoAtivo,
        postoAtivoId,
        loading,
        error,
        setPostoAtivo,
        setPostoAtivoById,
        refreshPostos,
    };

    return (
        <PostoContext.Provider value={value}>
            {children}
        </PostoContext.Provider>
    );
};

// ============================================
// EXPORT DO CONTEXTO (objeto puro, sem componente)
// ============================================
// O hook `usePosto` mora em `./usePosto.ts` — extraído para satisfazer
// `react-refresh/only-export-components` (Fast Refresh exige que um arquivo
// .tsx só exporte componentes).

export default PostoContext;
