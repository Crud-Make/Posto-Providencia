import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

/**
 * Componente que verifica periodicamente se há uma nova versão do sistema disponível.
 * Se houver, mostra um alerta visual chamativo convidando o usuário a atualizar.
 */
const UpdateNotifier: React.FC = () => {
    const [currentVersion, setCurrentVersion] = useState<string | null>(null);
    const checkInterval = useRef<number | null>(null);

    const fetchVersion = async () => {
        try {
            // Adicionamos um timestamp para evitar cache do navegador no arquivo JSON
            const response = await fetch(`/version.json?t=${Date.now()}`, {
                cache: 'no-store'
            });
            if (response.ok) {
                const data = await response.json();
                return data.version;
            }
        } catch (error) {
            console.error('Erro ao verificar versão:', error);
        }
        return null;
    };

    useEffect(() => {
        // Busca a versão inicial quando o app carrega
        const initVersion = async () => {
            const version = await fetchVersion();
            if (version) {
                console.log('Versão atual do sistema:', version);
                setCurrentVersion(version);
            }
        };

        initVersion();

        // Define uma verificação periódica (a cada 2 minutos)
        checkInterval.current = window.setInterval(async () => {
            const latestVersion = await fetchVersion();

            // Se já temos uma versão carregada e a nova for diferente, avisa o usuário
            if (currentVersion && latestVersion && latestVersion !== currentVersion) {
                // Exibe um alerta visual forte e persistente
                toast.error('🚀 ATUALIZAÇÃO PENDENTE!', {
                    description: 'Novas melhorias foram publicadas. Clique para atualizar seu sistema agora.',
                    duration: Infinity, // Não desaparece até o usuário clicar
                    style: {
                        background: '#1e40af', // Blue 800
                        color: '#ffffff',
                        border: '2px solid #3b82f6', // Blue 500
                    },
                    action: {
                        label: 'ATUALIZAR SISTEMA',
                        onClick: () => window.location.reload()
                    },
                    icon: <RefreshCw className="h-5 w-5 animate-spin text-white" />
                });

                // Uma vez que o toast foi mostrado, paramos de checar para não encher a tela
                if (checkInterval.current) {
                    clearInterval(checkInterval.current);
                }
            }
        }, 120000); // 120000ms = 2 minutos (Ideal para produção)

        return () => {
            if (checkInterval.current) {
                clearInterval(checkInterval.current);
            }
        };
    }, [currentVersion]);

    return null; // Este componente não renderiza nada visualmente por si só, apenas lógica e Toasts
};

export default UpdateNotifier;
