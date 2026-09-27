import React, { useState } from 'react';
import type { BombaDaApi, BombaDeclarada } from '../api/cadastro-de-bicos.api';
import { classeDoCampo } from './estilos';
import { Campo, Janela, RodapeDoFormulario } from './janela';

interface FormularioDeBombaProps {
    /** `null` = bomba nova. */
    readonly bomba: BombaDaApi | null;
    readonly aoGravar: (id: number | null, corpo: BombaDeclarada) => Promise<string | null>;
    readonly aoFechar: () => void;
}

/** "Nova bomba" / "Editar bomba": nome como está pintado nela, onde fica e se está ativa. */
export const FormularioDeBomba: React.FC<FormularioDeBombaProps> = ({ bomba, aoGravar, aoFechar }) => {
    const [nome, setNome] = useState(bomba?.nome ?? '');
    const [localizacao, setLocalizacao] = useState(bomba?.localizacao ?? '');
    const [ativo, setAtivo] = useState(bomba?.ativo ?? true);
    const [erro, setErro] = useState<string | null>(null);
    const [gravando, setGravando] = useState(false);

    const enviar = async (evento: React.FormEvent): Promise<void> => {
        evento.preventDefault();
        if (nome.trim() === '') { setErro('Informe o nome da bomba.'); return; }
        setGravando(true);
        const recusa = await aoGravar(bomba?.id ?? null, { nome: nome.trim(), localizacao: localizacao.trim() === '' ? null : localizacao.trim(), ativo });
        setGravando(false);
        if (recusa === null) aoFechar(); else setErro(recusa);
    };

    return (
        <Janela titulo={bomba === null ? 'Nova bomba' : `Editar ${bomba.nome}`} aoFechar={aoFechar}>
            <form onSubmit={(e) => { void enviar(e); }} className="space-y-4">
                <Campo rotulo="Nome (como está na bomba)">
                    <input className={classeDoCampo} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="BOMBA 01" maxLength={60} autoFocus />
                </Campo>
                <Campo rotulo="Onde fica (opcional)">
                    <input className={classeDoCampo} value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="Ilha da frente" maxLength={120} />
                </Campo>
                {bomba !== null && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
                        Bomba ativa (para desativar, desative antes os bicos dela)
                    </label>
                )}
                <RodapeDoFormulario erro={erro} gravando={gravando} aoCancelar={aoFechar} />
            </form>
        </Janela>
    );
};
