import React from 'react';
import { useGestaoDeBicos } from '../model/use-gestao-de-bicos';
import { CombustiveisETanques } from './combustiveis-e-tanques';
import { GestaoDeBicos } from './gestao-de-bicos';

/**
 * A pista do posto em Configurações (#153, #157): os dois cartões dividem o MESMO estado — o
 * combustível ou tanque criado num aparece na hora no formulário de bico do outro.
 */
export const PistaDoPosto: React.FC<{ readonly postoId: number | null }> = ({ postoId }) => {
    const gestao = useGestaoDeBicos(postoId);
    return (
        <>
            <CombustiveisETanques gestao={gestao} />
            <GestaoDeBicos gestao={gestao} />
        </>
    );
};
