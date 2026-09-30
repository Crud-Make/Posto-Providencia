// [10/01 17:46] Criado durante refatoração Issue #16
// [10/01 17:55] Fix: Removido any em handleFormChange
import { useState } from 'react';
import { formaPagamentoService } from '../../../services/api';
import { descreverErroDaApi, type ErroDaApi } from '../../../services/api/base';
import { configuracoesPelaApi, corpoDaForma, gravarFormaNaApi, paraFormaDaTela } from '../../../services/api/configuracoes.api';
import { FormaPagamento, PaymentFormState, PaymentType } from '../types';

/** Recusa de regra (nome repetido) chega com a frase pronta; o resto vira diagnóstico. */
const mensagemDaApi = (erro: ErroDaApi): string => (erro.tipo === 'recusado' ? erro.mensagem : descreverErroDaApi(erro));

/**
 * Hook para gerenciamento de formas de pagamento.
 * Controla o modal de criação/edição e as operações de salvar.
 * 
 * @param {number} postoAtivoId - ID do posto ativo
 * @param {React.Dispatch<React.SetStateAction<FormaPagamento[]>>} setPaymentMethods - Setter para atualizar a lista local
 * @returns {Object} Estados e funções de controle
 */
export const useFormaPagamento = (
    postoAtivoId: number,
    setPaymentMethods: React.Dispatch<React.SetStateAction<FormaPagamento[]>>,
    paymentMethods: readonly FormaPagamento[] = [],
) => {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<FormaPagamento | null>(null);
    const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
        name: "",
        type: "outros",
        tax: 0,
        active: true,
    });

    /**
     * Abre o modal de pagamento (para criar ou editar).
     * @param {FormaPagamento} [method] - Forma de pagamento para editar (opcional)
     */
    const openPaymentModal = (method?: FormaPagamento) => {
        if (method) {
            setEditingPayment(method);
            setPaymentForm({
                name: method.name,
                type: method.type as PaymentType,
                tax: method.tax,
                active: method.active,
            });
        } else {
            setEditingPayment(null);
            setPaymentForm({
                name: "",
                type: "outros",
                tax: 0,
                active: true,
            });
        }
        setIsPaymentModalOpen(true);
    };

    /**
     * Atualiza um campo do formulário.
     * @param {keyof PaymentFormState} field - Campo a atualizar
     * @param {string | number | boolean} value - Novo valor
     */
    const handleFormChange = (field: keyof PaymentFormState, value: string | number | boolean) => {
        setPaymentForm(prev => ({ ...prev, [field]: value }));
    };

    /**
     * Salva a forma de pagamento (cria ou atualiza).
     */
    /** #103: criar/editar pela API; o posto é o da rota, nunca o `|| 1` do caminho antigo. */
    const salvarPelaApi = async () => {
        const gravado = await gravarFormaNaApi(postoAtivoId, editingPayment?.id ?? null, corpoDaForma(paymentForm));
        if (gravado.isErr()) {
            alert(mensagemDaApi(gravado.error));
            return;
        }
        const forma = paraFormaDaTela(gravado.value);
        setPaymentMethods((prev) =>
            editingPayment ? prev.map((p) => (p.id === forma.id ? forma : p)) : [...prev, forma],
        );
        setIsPaymentModalOpen(false);
    };

    const handleSavePayment = async () => {
        if (!paymentForm.name) {
            alert("Nome é obrigatório");
            return;
        }
        if (configuracoesPelaApi()) {
            await salvarPelaApi();
            return;
        }

        try {
            if (editingPayment) {
                // Update
                const response = await formaPagamentoService.update(
                    Number(editingPayment.id),
                    {
                        nome: paymentForm.name,
                        tipo: paymentForm.type,
                        taxa: paymentForm.tax,
                        ativo: paymentForm.active,
                    }
                );

                if (!response.success || !response.data) {
                    alert("Erro ao atualizar forma de pagamento");
                    return;
                }
                const updated = response.data;

                setPaymentMethods((prev) =>
                    prev.map((p) =>
                        p.id === editingPayment.id
                            ? {
                                ...p,
                                name: updated.nome,
                                type: updated.tipo as PaymentType,
                                tax: updated.taxa || 0,
                                active: updated.ativo || false,
                            }
                            : p
                    )
                );
            } else {
                // Create
                const response = await formaPagamentoService.create({
                    nome: paymentForm.name!,
                    tipo: paymentForm.type || "outros",
                    taxa: paymentForm.tax || 0,
                    ativo: paymentForm.active,
                    posto_id: postoAtivoId || 1,
                });

                if (!response.success || !response.data) {
                    alert("Erro ao criar forma de pagamento");
                    return;
                }
                const created = response.data;

                setPaymentMethods((prev) => [
                    ...prev,
                    {
                        id: String(created.id),
                        name: created.nome,
                        type: created.tipo as PaymentType,
                        tax: created.taxa || 0,
                        active: created.ativo || false,
                    },
                ]);
            }
            setIsPaymentModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar forma de pagamento", error);
            alert("Erro ao salvar. Tente novamente.");
        }
    };

    /**
     * Alterna o status (ativo/inativo) de uma forma de pagamento.
     * @param {string} id - ID da forma de pagamento
     * @param {boolean} currentStatus - Status atual
     */
    /** #103: o PUT pede a forma inteira; troca só o `ativo`. `sumir` tira da lista (o "Excluir"). */
    const trocarAtivoPelaApi = async (id: string, ativo: boolean, sumir: boolean) => {
        const forma = paymentMethods.find((p) => p.id === id);
        if (forma === undefined) return;
        const gravado = await gravarFormaNaApi(postoAtivoId, id, corpoDaForma({ name: forma.name, type: forma.type, tax: forma.tax, active: ativo }));
        if (gravado.isErr()) {
            alert(mensagemDaApi(gravado.error));
            return;
        }
        const nova = paraFormaDaTela(gravado.value);
        setPaymentMethods((prev) => (sumir ? prev.filter((p) => p.id !== id) : prev.map((p) => (p.id === id ? nova : p))));
    };

    /** O "Excluir" da tela: desativa (nada se apaga) e some da lista, como some ao recarregar. */
    const handleDelete = async (id: string) => {
        await trocarAtivoPelaApi(id, false, true);
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        if (configuracoesPelaApi()) {
            await trocarAtivoPelaApi(id, !currentStatus, false);
            return;
        }
        try {
            const response = await formaPagamentoService.update(Number(id), { ativo: !currentStatus });
            if (!response.success || !response.data) {
                alert("Erro ao alterar status.");
                return;
            }
            const updated = response.data;
            setPaymentMethods(prev => prev.map(p => p.id === id ? { ...p, active: updated.ativo || false } : p));
        } catch (error) {
            console.error("Erro ao alterar status", error);
            alert("Erro ao alterar status.");
        }
    };

    return {
        isPaymentModalOpen,
        setIsPaymentModalOpen,
        editingPayment,
        paymentForm,
        openPaymentModal,
        handleFormChange,
        handleSavePayment,
        handleToggleStatus,
        handleDelete: configuracoesPelaApi() ? handleDelete : undefined,
    };
};
