import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { descreverErroDaApi } from '../../services/api/base';
import { fornecedorPelaApi, gravarFornecedorNaApi } from '../../services/api/fornecedor.api';
import type { Fornecedor } from '../../types/database/index';

interface Props {
    postoId: number | null;
    /** O fornecedor recém-gravado — a tela o põe na lista e já o seleciona. */
    aoCriar: (fornecedor: Fornecedor) => void;
}

const VAZIO = { nome: '', cnpj: '', contato: '' };
const CAMPO = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500';

/**
 * "+ Novo" ao lado do fornecedor da tela de Compras (#103). Achado do ensaio Jorro+BR (30/09/2026):
 * o posto novo não tinha fornecedor, a tela só tinha o `<select>` e a compra não podia ser lançada.
 * O CNPJ vai como digitado; a recusa da API (CNPJ inválido ou repetido) aparece aqui, com a frase dela.
 */
export const NovoFornecedor: React.FC<Props> = ({ postoId, aoCriar }) => {
    const [aberto, setAberto] = useState(false);
    const [form, setForm] = useState(VAZIO);
    const [erro, setErro] = useState<string | null>(null);
    const [gravando, setGravando] = useState(false);
    if (postoId === null || !fornecedorPelaApi()) return null;

    const fechar = (): void => { setAberto(false); setErro(null); setForm(VAZIO); };

    const enviar = async (evento: React.FormEvent): Promise<void> => {
        evento.preventDefault();
        if (form.nome.trim() === '' || form.cnpj.trim() === '') { setErro('Informe o nome e o CNPJ.'); return; }
        setGravando(true);
        const contato = form.contato.trim();
        const gravado = await gravarFornecedorNaApi(postoId, null, { nome: form.nome.trim(), cnpj: form.cnpj.trim(), contato: contato === '' ? null : contato, ativo: true });
        setGravando(false);
        if (gravado.isErr()) {
            setErro(gravado.error.tipo === 'recusado' ? gravado.error.mensagem : descreverErroDaApi(gravado.error));
            return;
        }
        toast.success(`Fornecedor ${gravado.value.nome} cadastrado.`);
        aoCriar(gravado.value);
        fechar();
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setAberto(true)}
                className="flex items-center gap-1 self-end rounded border border-orange-400/30 bg-white/10 px-2 py-1 text-sm text-white hover:bg-white/20"
            >
                <Plus size={14} aria-hidden="true" /> Novo fornecedor
            </button>
            {aberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form
                        role="dialog"
                        aria-modal="true"
                        aria-label="Novo fornecedor"
                        onSubmit={(e) => { void enviar(e); }}
                        className="w-full max-w-md space-y-3 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl"
                    >
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Novo fornecedor</h2>
                        <label className="block text-sm text-gray-700 dark:text-gray-300">
                            Nome
                            <input className={CAMPO} value={form.nome} maxLength={80} autoFocus onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Distribuidora Sertão" />
                        </label>
                        <label className="block text-sm text-gray-700 dark:text-gray-300">
                            CNPJ
                            <input className={CAMPO} value={form.cnpj} maxLength={24} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                        </label>
                        <label className="block text-sm text-gray-700 dark:text-gray-300">
                            Contato (opcional)
                            <input className={CAMPO} value={form.contato} maxLength={80} onChange={(e) => setForm({ ...form, contato: e.target.value })} placeholder="(75) 99999-0000" />
                        </label>
                        {erro !== null && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={fechar} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-200">Cancelar</button>
                            <button type="submit" disabled={gravando} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                                {gravando ? 'Salvando...' : 'Salvar fornecedor'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};
