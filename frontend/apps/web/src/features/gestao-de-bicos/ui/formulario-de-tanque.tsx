import React, { useState } from 'react';
import type { CombustivelDaApi, TanqueDaApi, TanqueDeclarado } from '../api/cadastro-de-bicos.api';
import { corpoDoTanque, litrosParaCampo, type FormularioDeTanque as Estado } from '../model/cadastro';
import { classeDoCampo } from './estilos';
import { Campo, Janela, RodapeDoFormulario } from './janela';

interface FormularioDeTanqueProps {
    /** `null` = tanque novo. */
    readonly tanque: TanqueDaApi | null;
    readonly combustiveis: readonly CombustivelDaApi[];
    /** Combustível já escolhido ao abrir pelo "+ tanque de …" de um combustível. */
    readonly combustivelId: number | null;
    readonly aoGravar: (id: number | null, corpo: TanqueDeclarado) => Promise<string | null>;
    readonly aoFechar: () => void;
}

/** "Novo tanque" / "Editar tanque": nome, combustível e capacidade. Estoque não se digita aqui. */
export const FormularioDeTanque: React.FC<FormularioDeTanqueProps> = ({ tanque, combustiveis, combustivelId, aoGravar, aoFechar }) => {
    const [form, setForm] = useState<Estado>(() => ({
        nome: tanque?.nome ?? '',
        combustivelId: tanque?.combustivel_id ?? combustivelId,
        capacidade: tanque === null ? '' : litrosParaCampo(tanque.capacidade),
        ativo: tanque?.ativo !== false,
    }));
    const [erro, setErro] = useState<string | null>(null);
    const [gravando, setGravando] = useState(false);
    const opcoes = combustiveis.filter((c) => c.ativo || c.id === form.combustivelId);

    const enviar = async (evento: React.FormEvent): Promise<void> => {
        evento.preventDefault();
        const lido = corpoDoTanque(form);
        if (!lido.ok) { setErro(lido.motivo); return; }
        setGravando(true);
        const recusa = await aoGravar(tanque?.id ?? null, lido.valor);
        setGravando(false);
        if (recusa === null) aoFechar(); else setErro(recusa);
    };

    return (
        <Janela titulo={tanque === null ? 'Novo tanque' : `Editar ${tanque.nome}`} aoFechar={aoFechar}>
            <form onSubmit={(e) => { void enviar(e); }} className="space-y-4">
                <Campo rotulo="Nome">
                    <input className={classeDoCampo} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Tanque GC" maxLength={60} autoFocus />
                </Campo>
                <Campo rotulo="Combustível">
                    <select className={classeDoCampo} value={form.combustivelId ?? ''} onChange={(e) => setForm({ ...form, combustivelId: e.target.value === '' ? null : Number(e.target.value) })}>
                        <option value="">Escolha…</option>
                        {opcoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                </Campo>
                <Campo rotulo="Capacidade (litros)">
                    <input className={classeDoCampo} inputMode="decimal" value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: e.target.value })} placeholder="20.000" />
                </Campo>
                {tanque === null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        O tanque começa sem estoque. O estoque de partida é a primeira medição de régua, na tela Tanques.
                    </p>
                )}
                {tanque !== null && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                        Tanque ativo (para desativar, tire antes os bicos que puxam dele)
                    </label>
                )}
                <RodapeDoFormulario erro={erro} gravando={gravando} aoCancelar={aoFechar} />
            </form>
        </Janela>
    );
};
