import React from 'react';
import { Edit2 } from 'lucide-react';
import type { BombaDaApi } from '../api/cadastro-de-bicos.api';
import type { BicoNaPista, BombaNaPista } from '../model/pista';

interface BombaNaPistaProps {
    readonly grupo: BombaNaPista;
    readonly aoEditarBomba: (bomba: BombaDaApi) => void;
    readonly aoEditarBico: (bico: BicoNaPista, bomba: BombaDaApi) => void;
}

const Inativo: React.FC = () => (
    <span className="rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">desativado</span>
);

const LinhaDoBico: React.FC<{ readonly bico: BicoNaPista; readonly aoEditar: () => void }> = ({ bico, aoEditar }) => (
    <li className={`flex items-center gap-3 px-4 py-2.5 ${bico.ativo ? '' : 'opacity-50'}`}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200">
            {bico.numero}
        </span>
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: bico.combustivel?.cor ?? '#9CA3AF' }} aria-hidden="true" />
        <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">{bico.combustivel?.nome ?? 'Combustível não encontrado'}</span>
            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{bico.tanque?.nome ?? 'Sem tanque'}</span>
        </span>
        {!bico.ativo && <Inativo />}
        <button type="button" onClick={aoEditar} aria-label={`Editar bico ${bico.numero}`} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
            <Edit2 size={16} />
        </button>
    </li>
);

/** Uma bomba e os bicos dela, como o frentista a vê no pátio. */
export const BombaNaPistaCartao: React.FC<BombaNaPistaProps> = ({ grupo, aoEditarBomba, aoEditarBico }) => (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700">
        <header className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5">
            <h4 className="text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100">{grupo.bomba.nome}</h4>
            {grupo.bomba.localizacao !== null && <span className="truncate text-xs text-gray-500 dark:text-gray-400">· {grupo.bomba.localizacao}</span>}
            {!grupo.bomba.ativo && <Inativo />}
            <span className="ml-auto text-xs text-gray-400">{grupo.bicos.length} {grupo.bicos.length === 1 ? 'bico' : 'bicos'}</span>
            <button type="button" onClick={() => aoEditarBomba(grupo.bomba)} aria-label={`Editar ${grupo.bomba.nome}`} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                <Edit2 size={14} />
            </button>
        </header>
        {grupo.bicos.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">Nenhum bico nesta bomba.</p>
        ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {grupo.bicos.map((b) => <LinhaDoBico key={b.id} bico={b} aoEditar={() => aoEditarBico(b, grupo.bomba)} />)}
            </ul>
        )}
    </section>
);
