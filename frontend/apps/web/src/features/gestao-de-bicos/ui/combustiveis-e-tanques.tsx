import React, { useState } from 'react';
import { Droplets, Edit2, Plus } from 'lucide-react';
import type { CombustivelDaApi, TanqueDaApi } from '../api/cadastro-de-bicos.api';
import { combustiveisComTanques, litrosParaTela, precoParaTela } from '../model/cadastro';
import type { GestaoDeBicos as Gestao } from '../model/use-gestao-de-bicos';
import { classeDoBotao } from './estilos';
import { FormularioDeCombustivel } from './formulario-de-combustivel';
import { FormularioDeTanque } from './formulario-de-tanque';

type Aberto =
    | { readonly tipo: 'combustivel'; readonly combustivel: CombustivelDaApi | null }
    | { readonly tipo: 'tanque'; readonly tanque: TanqueDaApi | null; readonly combustivelId: number | null };

const Inativo: React.FC = () => (
    <span className="rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">desativado</span>
);

const botaoDeLapis = 'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400';

interface LinhaProps {
    readonly combustivel: CombustivelDaApi;
    readonly tanques: readonly TanqueDaApi[];
    readonly abrir: (aberto: Aberto) => void;
}

/** Um combustível (cor, código, preço) e os tanques dele. */
const CombustivelNaLista: React.FC<LinhaProps> = ({ combustivel, tanques, abrir }) => (
    <section className={`rounded-lg border border-gray-200 dark:border-gray-700 ${combustivel.ativo ? '' : 'opacity-60'}`}>
        <header className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5">
            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: combustivel.cor ?? '#9CA3AF' }} aria-hidden="true" />
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{combustivel.nome}</h4>
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{combustivel.codigo}</span>
            {!combustivel.ativo && <Inativo />}
            <span className="ml-auto text-sm font-bold text-gray-700 dark:text-gray-200">{precoParaTela(combustivel.preco_venda)}</span>
            <button type="button" className={botaoDeLapis} aria-label={`Editar ${combustivel.nome}`} onClick={() => abrir({ tipo: 'combustivel', combustivel })}>
                <Edit2 size={14} />
            </button>
        </header>
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {tanques.map((t) => (
                <li key={t.id} className={`flex items-center gap-3 px-4 py-2 ${t.ativo === false ? 'opacity-50' : ''}`}>
                    <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{t.nome}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{litrosParaTela(t.capacidade)}</span>
                    {t.ativo === false && <Inativo />}
                    <button type="button" className={botaoDeLapis} aria-label={`Editar ${t.nome}`} onClick={() => abrir({ tipo: 'tanque', tanque: t, combustivelId: t.combustivel_id })}>
                        <Edit2 size={14} />
                    </button>
                </li>
            ))}
            <li className="px-4 py-2">
                <button type="button" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline" onClick={() => abrir({ tipo: 'tanque', tanque: null, combustivelId: combustivel.id })}>
                    + tanque de {combustivel.nome}
                </button>
            </li>
        </ul>
    </section>
);

/**
 * Configurações → Combustíveis e Tanques (#157): cada combustível com o preço de venda de partida
 * e os tanques dele. O tanque não tem estoque aqui — a partida é a primeira régua.
 */
export const CombustiveisETanques: React.FC<{ readonly gestao: Gestao }> = ({ gestao }) => {
    const { pista, erro, gravarCombustivel, gravarTanque } = gestao;
    const [mostrarInativos, setMostrarInativos] = useState(false);
    const [aberto, setAberto] = useState<Aberto | null>(null);
    const lista = pista === null ? [] : combustiveisComTanques(pista, mostrarInativos);
    const fechar = (): void => setAberto(null);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-3 justify-between items-center">
                <div className="flex items-center gap-3">
                    <Droplets className="text-blue-600 dark:text-blue-500" size={24} />
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Combustíveis e Tanques</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Preço de venda de partida do dia e de onde cada combustível sai.</p>
                    </div>
                </div>
                <button type="button" className={classeDoBotao} disabled={pista === null} onClick={() => setAberto({ tipo: 'combustivel', combustivel: null })}>
                    <Plus size={14} /> COMBUSTÍVEL
                </button>
            </div>
            <div className="p-4 space-y-3">
                {erro !== null && <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">{erro}</p>}
                {pista !== null && lista.length === 0 && <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Nenhum combustível cadastrado. Comece por “+ Combustível”.</p>}
                {lista.map((c) => <CombustivelNaLista key={c.combustivel.id} combustivel={c.combustivel} tanques={c.tanques} abrir={setAberto} />)}
                {pista !== null && (
                    <label className="flex items-center gap-2 px-1 text-xs text-gray-500 dark:text-gray-400">
                        <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />
                        Mostrar combustíveis e tanques desativados
                    </label>
                )}
            </div>
            {aberto?.tipo === 'combustivel' && <FormularioDeCombustivel combustivel={aberto.combustivel} aoGravar={gravarCombustivel} aoFechar={fechar} />}
            {aberto?.tipo === 'tanque' && pista !== null && (
                <FormularioDeTanque tanque={aberto.tanque} combustiveis={pista.combustiveis} combustivelId={aberto.combustivelId} aoGravar={gravarTanque} aoFechar={fechar} />
            )}
        </div>
    );
};
