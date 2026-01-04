import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

/**
 * Componente que verifica periodicamente se há uma nova versão do sistema disponível.
 * Se houver, mostra um alerta (toast) convidando o usuário a atualizar.
 */
const UpdateNotifier: React.FC = () => {
    const [currentVersion, setCurrentVersion] = useState<string | null>(null);
    const checkInterval = useRef<NodeJS.Timeout | null>(null);

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
        checkInterval.current = setInterval(async () => {
            const latestVersion = await fetchVersion();

            // Se já temos uma versão carregada e a nova for diferente, avisa o usuário
            if (currentVersion && latestVersion && latestVersion !== currentVersion) {
                toast.info('Nova atualização disponível!', {
                    description: 'Clique no botão abaixo para aplicar as melhorias agora.',
                    duration: Infinity, // Fica visível até o usuário agir
                    action: {
                        label: 'Atualizar Agora',
                        onClick: () => window.location.reload()
                    },
                    icon: <RefreshCw className="h-4 w-4 animate-spin" />
                });

                // Uma vez que o toast foi mostrado, paramos de checar para não encher a tela
                if (checkInterval.current) {
                    clearInterval(checkInterval.current);
                }
            }
        }, 120000); // 120000ms = 2 minutos

        return () => {
            if (checkInterval.current) {
                clearInterval(checkInterval.current);
            }
        };
    }, [currentVersion]);

    return null; // Este componente não renderiza nada visualmente por si só, apenas lógica e Toasts
};

export default UpdateNotifier;
