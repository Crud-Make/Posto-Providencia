import React, { useState } from 'react';
import type { BicoDeclarado, PistaDaApi } from '../api/cadastro-de-bicos.api';
import { corpoDoBico, tanquesDoCombustivel, trocaCombustivel, type FormularioDeBico as Estado } from '../model/pista';
import { classeDoCampo } from './estilos';
import { Campo, Janela, RodapeDoFormulario } from './janela';

interface FormularioDeBicoProps {
    readonly pista: PistaDaApi;
    /** `id` nulo = bico novo. */
    readonly id: number | null;
    readonly inicial: Estado;
    readonly aoGravar: (id: number | null, corpo: BicoDeclarado) => Promise<string | null>;
    readonly aoFechar: () => void;
}

const paraId = (valor: string): number | null => (valor === '' ? null : Number(valor));

/** "Novo bico" / "Editar bico": número, bomba, combustível e — só os daquele combustível — o tanque. */
export const FormularioDeBico: React.FC<FormularioDeBicoProps> = ({ pista, id, inicial, aoGravar, aoFechar }) => {
    const [form, setForm] = useState<Estado>(inicial);
    const [erro, setErro] = useState<string | null>(null);
    const [gravando, setGravando] = useState(false);
    const bombas = pista.bombas.filter((b) => b.ativo || b.id === inicial.bombaId);
    const combustiveis = pista.combustiveis.filter((c) => c.ativo || c.id === inicial.combustivelId);
    const tanques = tanquesDoCombustivel(pista.tanques, form.combustivelId);

    const enviar = async (evento: React.FormEvent): Promise<void> => {
        evento.preventDefault();
        const lido = corpoDoBico(form);
        if (!lido.ok) { setErro(lido.motivo); return; }
        setGravando(true);
        const recusa = await aoGravar(id, lido.corpo);
        setGravando(false);
        if (recusa === null) aoFechar(); else setErro(recusa);
    };

    return (
        <Janela titulo={id === null ? 'Novo bico' : `Editar bico ${inicial.numero}`} aoFechar={aoFechar}>
            <form onSubmit={(e) => { void enviar(e); }} className="space-y-4">
                <Campo rotulo="Número (o gravado no bico)">
                    <input className={classeDoCampo} inputMode="numeric" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} autoFocus />
                </Campo>
                <Campo rotulo="Bomba">
                    <select className={classeDoCampo} value={form.bombaId ?? ''} onChange={(e) => setForm({ ...form, bombaId: paraId(e.target.value) })}>
                        <option value="">Escolha…</option>
                        {bombas.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
                    </select>
                </Campo>
                <Campo rotulo="Combustível">
                    <select className={classeDoCampo} value={form.combustivelId ?? ''} onChange={(e) => setForm(trocaCombustivel(form, paraId(e.target.value), pista.tanques))}>
                        <option value="">Escolha…</option>
                        {combustiveis.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                </Campo>
                <Campo rotulo="Tanque de onde puxa">
                    <select className={classeDoCampo} value={form.tanqueId ?? ''} disabled={form.combustivelId === null} onChange={(e) => setForm({ ...form, tanqueId: paraId(e.target.value) })}>
                        <option value="">{form.combustivelId === null ? 'Escolha o combustível antes' : 'Escolha…'}</option>
                        {tanques.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                </Campo>
                {id !== null && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                        Bico ativo
                    </label>
                )}
                <RodapeDoFormulario erro={erro} gravando={gravando} aoCancelar={aoFechar} />
            </form>
        </Janela>
    );
};
