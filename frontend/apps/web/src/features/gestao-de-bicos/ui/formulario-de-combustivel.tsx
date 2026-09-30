import React, { useState } from 'react';
import type { CombustivelDaApi, CombustivelDeclarado } from '../api/cadastro-de-bicos.api';
import { corpoDoCombustivel, custoParaCampo, type FormularioDeCombustivel as Estado } from '../model/cadastro';
import { classeDoCampo } from './estilos';
import { Campo, Janela, RodapeDoFormulario } from './janela';

interface FormularioDeCombustivelProps {
    /** `null` = combustível novo. */
    readonly combustivel: CombustivelDaApi | null;
    readonly aoGravar: (id: number | null, corpo: CombustivelDeclarado) => Promise<string | null>;
    readonly aoFechar: () => void;
}

const inicial = (c: CombustivelDaApi | null): Estado => ({
    nome: c?.nome ?? '',
    codigo: c?.codigo ?? '',
    cor: c?.cor ?? '#3B82F6',
    preco: c === null ? '' : c.preco_venda.replace('.', ','),
    custo: custoParaCampo(c?.preco_custo ?? null),
    ativo: c?.ativo ?? true,
});

/** "Novo combustível" / "Editar combustível": nome, código, cor, o preço de venda de partida do dia e o custo. */
export const FormularioDeCombustivel: React.FC<FormularioDeCombustivelProps> = ({ combustivel, aoGravar, aoFechar }) => {
    const [form, setForm] = useState<Estado>(() => inicial(combustivel));
    const [erro, setErro] = useState<string | null>(null);
    const [gravando, setGravando] = useState(false);

    const enviar = async (evento: React.FormEvent): Promise<void> => {
        evento.preventDefault();
        const lido = corpoDoCombustivel(form);
        if (!lido.ok) { setErro(lido.motivo); return; }
        setGravando(true);
        const recusa = await aoGravar(combustivel?.id ?? null, lido.valor);
        setGravando(false);
        if (recusa === null) aoFechar(); else setErro(recusa);
    };

    return (
        <Janela titulo={combustivel === null ? 'Novo combustível' : `Editar ${combustivel.nome}`} aoFechar={aoFechar}>
            <form onSubmit={(e) => { void enviar(e); }} className="space-y-4">
                <Campo rotulo="Nome">
                    <input className={classeDoCampo} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Gasolina Comum" maxLength={60} autoFocus />
                </Campo>
                <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Código">
                        <input className={classeDoCampo} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="GC" maxLength={6} />
                    </Campo>
                    <Campo rotulo="Cor">
                        <input type="color" className="h-[38px] w-full cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
                    </Campo>
                </div>
                <Campo rotulo="Preço de venda por litro (R$)">
                    <input className={classeDoCampo} inputMode="decimal" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} placeholder="6,89" />
                </Campo>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    É o preço de partida do dia no Fechamento. Mudar aqui não altera dias já salvos.
                </p>
                <Campo rotulo="Preço de custo por litro (R$)">
                    <input className={classeDoCampo} inputMode="decimal" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} placeholder="5,34" />
                </Campo>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Quanto o litro custa ao posto. Entra no lucro previsto dos Tanques; em branco, a tela avisa que falta o custo.
                </p>
                {combustivel !== null && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                        Combustível ativo (para desativar, desative antes os bicos dele)
                    </label>
                )}
                <RodapeDoFormulario erro={erro} gravando={gravando} aoCancelar={aoFechar} />
            </form>
        </Janela>
    );
};
