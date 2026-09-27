import React, { useState } from 'react';
import { Fuel, Plus } from 'lucide-react';
import type { BombaDaApi, PistaDaApi } from '../api/cadastro-de-bicos.api';
import { agruparPorBomba, proximoNumeroLivre, type BicoNaPista, type FormularioDeBico as EstadoDoBico } from '../model/pista';
import { useGestaoDeBicos } from '../model/use-gestao-de-bicos';
import { BombaNaPistaCartao } from './bomba-na-pista';
import { FormularioDeBico } from './formulario-de-bico';
import { FormularioDeBomba } from './formulario-de-bomba';
import { classeDoBotao } from './estilos';

type Aberto =
    | { readonly tipo: 'bomba'; readonly bomba: BombaDaApi | null }
    | { readonly tipo: 'bico'; readonly id: number | null; readonly inicial: EstadoDoBico };

function bicoNovo(pista: PistaDaApi): Aberto {
    const bombasAtivas = pista.bombas.filter((b) => b.ativo);
    const unica = bombasAtivas.length === 1 ? bombasAtivas[0] : undefined;
    return {
        tipo: 'bico',
        id: null,
        inicial: { numero: String(proximoNumeroLivre(pista.bicos)), bombaId: unica?.id ?? null, combustivelId: null, tanqueId: null, ativo: true },
    };
}

function bicoExistente(bico: BicoNaPista, bomba: BombaDaApi): Aberto {
    return {
        tipo: 'bico',
        id: bico.id,
        inicial: { numero: String(bico.numero), bombaId: bomba.id, combustivelId: bico.combustivel?.id ?? null, tanqueId: bico.tanque?.id ?? null, ativo: bico.ativo },
    };
}

interface CabecalhoProps {
    readonly pista: PistaDaApi | null;
    readonly aoNovaBomba: () => void;
    readonly aoNovoBico: () => void;
}

/** Título, a contagem da pista e os botões "+ Bomba" / "+ Bico". */
const Cabecalho: React.FC<CabecalhoProps> = ({ pista, aoNovaBomba, aoNovoBico }) => {
    const bicos = pista?.bicos.filter((b) => b.ativo).length ?? 0;
    const bombas = pista?.bombas.filter((b) => b.ativo).length ?? 0;
    const semBomba = pista !== null && bombas === 0;
    return (
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-3 justify-between items-center">
            <div className="flex items-center gap-3">
                <Fuel className="text-blue-600 dark:text-blue-500" size={24} />
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Bombas e Bicos</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {bicos} {bicos === 1 ? 'bico ativo' : 'bicos ativos'} em {bombas} {bombas === 1 ? 'bomba' : 'bombas'}
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <button type="button" className={classeDoBotao} disabled={pista === null} onClick={aoNovaBomba}>
                    <Plus size={14} /> BOMBA
                </button>
                <button type="button" className={classeDoBotao} disabled={pista === null || semBomba} title={semBomba ? 'Cadastre uma bomba primeiro' : undefined} onClick={aoNovoBico}>
                    <Plus size={14} /> BICO
                </button>
            </div>
        </div>
    );
};

/**
 * Configurações → Bombas e Bicos (#153): a pista do posto agrupada por bomba, e o cadastro dela
 * pela API. É aqui que o gerente monta os bicos do posto (o BR tem 24) sem mexer no banco.
 */
export const GestaoDeBicos: React.FC<{ readonly postoId: number | null }> = ({ postoId }) => {
    const { pista, carregando, erro, gravarBomba, gravarBico } = useGestaoDeBicos(postoId);
    const [mostrarInativos, setMostrarInativos] = useState(false);
    const [aberto, setAberto] = useState<Aberto | null>(null);
    const grupos = pista === null ? [] : agruparPorBomba(pista, mostrarInativos);
    const fechar = (): void => setAberto(null);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <Cabecalho pista={pista} aoNovaBomba={() => setAberto({ tipo: 'bomba', bomba: null })} aoNovoBico={() => { if (pista !== null) setAberto(bicoNovo(pista)); }} />
            <div className="p-4 space-y-3">
                {erro !== null && <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">{erro}</p>}
                {carregando && pista === null && <p className="p-4 text-center text-sm text-gray-500">Carregando a pista…</p>}
                {pista !== null && grupos.length === 0 && <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma bomba cadastrada. Comece por “+ Bomba”.</p>}
                {grupos.map((g) => (
                    <BombaNaPistaCartao key={g.bomba.id} grupo={g} aoEditarBomba={(bomba) => setAberto({ tipo: 'bomba', bomba })} aoEditarBico={(bico, bomba) => setAberto(bicoExistente(bico, bomba))} />
                ))}
                {pista !== null && (
                    <label className="flex items-center gap-2 px-1 text-xs text-gray-500 dark:text-gray-400">
                        <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />
                        Mostrar bombas e bicos desativados
                    </label>
                )}
            </div>
            {aberto?.tipo === 'bomba' && <FormularioDeBomba bomba={aberto.bomba} aoGravar={gravarBomba} aoFechar={fechar} />}
            {aberto?.tipo === 'bico' && pista !== null && <FormularioDeBico pista={pista} id={aberto.id} inicial={aberto.inicial} aoGravar={gravarBico} aoFechar={fechar} />}
        </div>
    );
};
