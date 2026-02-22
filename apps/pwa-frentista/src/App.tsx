import React, { useState, useEffect } from 'react';
import {
  User, Calendar, Gauge, Smartphone, Banknote,
  Coins, CircleDollarSign, FileText, CreditCard,
  ClipboardList, ShoppingBag, History, ChevronDown,
  Plus, X, Receipt, Check, AlertCircle
} from 'lucide-react';
import { api } from './services/api';

// Reusable card for payments
const PaymentCard = ({ title, icon: Icon, iconColor, value, onChange }: any) => (
  <div className="bg-[#131722] rounded-2xl p-4 border border-slate-800/60 shadow-sm flex flex-col justify-between h-28">
    <div className="flex items-center gap-2 mb-2">
      <div className={`p-1.5 rounded-lg bg-opacity-10 flex items-center justify-center ${iconColor.bg}`}>
        <Icon size={16} className={iconColor.text} />
      </div>
      <span className={`text-[0.7rem] font-bold tracking-wider ${iconColor.text} uppercase`}>
        {title}
      </span>
    </div>
    <div className="flex items-end gap-1 border-b border-slate-700/50 pb-1">
      <span className="text-slate-400 font-medium text-sm mb-0.5">R$</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={onChange}
        className="bg-transparent text-white text-xl font-semibold w-full outline-none focus:ring-0"
        placeholder="0,00"
      />
    </div>
  </div>
);

const formatCurrency = (value: string) => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  const amount = parseInt(numericValue, 10) / 100;
  return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFrentista, setSelectedFrentista] = useState<{ id: number, nome: string } | null>(null);
  const [frentistas, setFrentistas] = useState<{ id: number, nome: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Busca do banco POSTO ID: 1 como padrão (Pode vir de config/storage depois)
    api.getFrentistas(1).then(data => data && setFrentistas(data)).catch(err => console.error(err));
  }, []);

  const [totalVendido, setTotalVendido] = useState('');
  const [payments, setPayments] = useState({
    pix: '',
    dinheiro: '',
    moedas: '',
    baratao: '',
    notaPrazo: '',
    debito: ''
  });

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalVendido(formatCurrency(e.target.value));
  };

  const handlePaymentChange = (field: keyof typeof payments) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPayments(prev => ({ ...prev, [field]: formatCurrency(e.target.value) }));
  };

  const calculateTotalPaymentsValue = () => {
    let total = 0;
    for (const key in payments) {
      if (Object.prototype.hasOwnProperty.call(payments, key)) {
        const value = payments[key as keyof typeof payments];
        total += parseInt(value.replace(/\D/g, ''), 10) || 0;
      }
    }
    return total;
  };

  const renderDifference = () => {
    const totalPayments = calculateTotalPaymentsValue();
    const totalSold = parseInt(totalVendido.replace(/\D/g, ''), 10) || 0;
    const difference = totalPayments - totalSold;

    if (totalSold === 0) {
      return <p className="text-slate-400 font-medium">Informe o encerrante para ver o status</p>;
    }

    const formattedDiff = (difference / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (difference === 0) {
      return <p className="text-green-400 font-medium flex items-center gap-1"><Check size={16} /> Tudo certo!</p>;
    } else if (difference > 0) {
      return <p className="text-orange-400 font-medium flex items-center gap-1"><AlertCircle size={16} /> ⬆️ Sobra de Caixa (R$ {formattedDiff})</p>;
    }
    return <p className="text-red-400 font-medium flex items-center gap-1"><AlertCircle size={16} /> ⬇️ Quebra de Caixa (R$ {formattedDiff})</p>;
  };

  const handleSubmit = async () => {
    if (!selectedFrentista) {
      alert("Selecione um frentista antes de enviar.");
      return;
    }

    const valueEncerrante = parseInt(totalVendido.replace(/\D/g, ''), 10) / 100;
    if (isNaN(valueEncerrante) || valueEncerrante === 0) {
      alert("O encerrante não pode ser R$ 0,00.");
      return;
    }

    setIsSubmitting(true);
    try {
      const dataStr = new Date().toISOString().split('T')[0];
      const turnoId = 1; // Fixo no exemplo (Ou calculado dependendo do horário)
      const postoId = 1;

      // Chama a lógica inteligente da interface
      const fechamentoId = await api.getOrCreateFechamento(postoId, dataStr, turnoId);

      const payload = {
        fechamento_id: fechamentoId,
        frentista_id: selectedFrentista.id,
        posto_id: postoId,
        encerrante: valueEncerrante,
        valor_pix: parseInt(payments.pix.replace(/\D/g, ''), 10) / 100 || 0,
        valor_dinheiro: parseInt(payments.dinheiro.replace(/\D/g, ''), 10) / 100 || 0,
        valor_moedas: parseInt(payments.moedas.replace(/\D/g, ''), 10) / 100 || 0,
        baratao: parseInt(payments.baratao.replace(/\D/g, ''), 10) / 100 || 0,
        valor_nota: parseInt(payments.notaPrazo.replace(/\D/g, ''), 10) / 100 || 0,
        valor_cartao_debito: parseInt(payments.debito.replace(/\D/g, ''), 10) / 100 || 0,
        valor_cartao_credito: 0,
        valor_cartao: 0,
        valor_conferido: calculateTotalPaymentsValue() / 100,
        diferenca_calculada: (calculateTotalPaymentsValue() - parseInt(totalVendido.replace(/\D/g, ''), 10)) / 100,
        observacoes: "Fechamento via PWA Frentista"
      };

      await api.submitFrentistaClosing(payload);

      alert("Registro do Turno enviado com sucesso! ✅");
      // Limpa os dados
      setTotalVendido('');
      setPayments({ pix: '', dinheiro: '', moedas: '', baratao: '', notaPrazo: '', debito: '' });
      setSelectedFrentista(null);

    } catch (err: any) {
      alert(`Erro no envio: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0D14] text-slate-100 font-sans pb-32">
      <div className="p-5 flex-1 space-y-4">
        <h1 className="text-2xl font-bold text-white mb-6">Registro de Turno</h1>

        {/* Selecionar Frentista */}
        <div
          onClick={() => setIsModalOpen(true)}
          className="bg-[#131722] rounded-3xl p-4 border border-slate-800/60 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-900/40 flex items-center justify-center border border-red-800/50">
              {selectedFrentista ? (
                <span className="text-red-500 font-bold text-lg">{selectedFrentista.nome.charAt(0)}</span>
              ) : (
                <User size={24} className="text-red-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">
                  <span>{selectedFrentista ? selectedFrentista.nome : 'Selecionar Frentista'}</span>
                </h2>
                <ChevronDown size={16} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-400 mt-0.5">Posto Jorro</p>
            </div>
          </div>
          {selectedFrentista ? (
            <div className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-sm font-semibold border border-indigo-500/30">
              Mudar
            </div>
          ) : (
            <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-semibold border border-blue-500/30">
              Obrigatório
            </div>
          )}
        </div>

        {/* Data do Fechamento */}
        <div className="bg-[#131722] rounded-3xl p-4 border border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-900/20 flex items-center justify-center border border-blue-800/30">
              <Calendar size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-0.5">Data do Fechamento</p>
              <h2 className="text-lg font-bold text-white leading-tight">22/02/2026</h2>
            </div>
          </div>
          <button className="bg-[#2563EB] hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl transition-colors text-sm shadow-[0_0_10px_rgba(37,99,235,0.3)]">
            Alterar
          </button>
        </div>

        {/* Conferência de Vendas (Roxo) */}
        <div className="bg-gradient-to-br from-[#5B4EFF] to-[#7B61FF] rounded-[1.75rem] p-5 shadow-lg shadow-indigo-500/20 mt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center bg-white/10">
              <Gauge size={16} className="text-white" />
            </div>
            <p className="text-[10px] font-bold text-white/90 tracking-wider uppercase">Conferência de Vendas</p>
          </div>
          <h2 className="text-white font-bold text-xl mb-3">Total Vendido (R$)</h2>
          <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-2 backdrop-blur-sm border border-white/20">
            <span className="text-white/70 font-bold text-2xl">R$</span>
            <input
              type="text"
              inputMode="numeric"
              value={totalVendido}
              onChange={handleTotalChange}
              className="bg-transparent text-white text-3xl font-bold w-full outline-none focus:ring-0 placeholder:text-white/30"
              placeholder="0,00"
            />
          </div>
        </div>

        {/* Recebimentos */}
        <div className="pt-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💰</span>
            <h2 className="text-xl font-bold text-white">Recebimentos</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4 font-medium">Toque nos campos para preencher os valores</p>

          <div className="grid grid-cols-2 gap-3">
            <PaymentCard title="PIX" icon={Smartphone} iconColor={{ bg: 'bg-[#06B6D4]/20', text: 'text-[#06B6D4]' }} value={payments.pix} onChange={handlePaymentChange('pix')} />
            <PaymentCard title="Dinheiro" icon={Banknote} iconColor={{ bg: 'bg-[#10B981]/20', text: 'text-[#10B981]' }} value={payments.dinheiro} onChange={handlePaymentChange('dinheiro')} />
            <PaymentCard title="Moedas" icon={Coins} iconColor={{ bg: 'bg-[#F59E0B]/20', text: 'text-[#F59E0B]' }} value={payments.moedas} onChange={handlePaymentChange('moedas')} />
            <PaymentCard title="Baratão" icon={CircleDollarSign} iconColor={{ bg: 'bg-[#EF4444]/20', text: 'text-[#EF4444]' }} value={payments.baratao} onChange={handlePaymentChange('baratao')} />
            <PaymentCard title="Nota a Prazo" icon={FileText} iconColor={{ bg: 'bg-[#00B4D8]/20', text: 'text-[#00B4D8]' }} value={payments.notaPrazo} onChange={handlePaymentChange('notaPrazo')} />
            <PaymentCard title="Débito" icon={CreditCard} iconColor={{ bg: 'bg-[#3B82F6]/20', text: 'text-[#3B82F6]' }} value={payments.debito} onChange={handlePaymentChange('debito')} />
          </div>
        </div>

        {/* Resumo do Turno */}
        <div className="pt-4 pb-2">
          <div className="bg-[#131722] rounded-[1.75rem] p-6 border border-slate-800/60">
            <div className="flex items-center gap-2 mb-6">
              <History size={18} className="text-slate-400" />
              <h3 className="text-white font-bold">Resumo do Turno</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Encerrante</span>
                <span className="text-[#A78BFA] font-bold text-lg">R$ {totalVendido || '0,00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Total Pagamentos</span>
                <span className="text-white font-bold text-lg">R$ {(calculateTotalPaymentsValue() / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="border-t border-slate-700/50 border-dashed pt-4">
              {renderDifference()}
            </div>
          </div>
        </div>

        {/* Botão Enviar Registro */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all 
                  ${isSubmitting ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-[0_0_20px_rgba(79,70,229,0.3)] shadow-indigo-600/20'}`}
        >
          <Check size={20} />
          {isSubmitting ? 'Enviando...' : 'Enviar Registro'}
        </button>
      </div>

      {/* Modal Frentistas Overscreen */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="bg-[#0A0D14] w-full rounded-t-[2rem] pt-6 flex flex-col h-[85vh] relative z-10 transform transition-transform shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            {/* Header Vermelho */}
            <div className="bg-[#D32F2F] absolute top-0 left-0 right-0 h-28 rounded-t-[2rem] flex items-start justify-between p-6 overflow-hidden">
              <div className="z-10">
                <h2 className="text-2xl font-bold text-white mb-0.5">Quem está trabalhando?</h2>
                <p className="text-red-100/80 text-sm">8 frentistas ativos</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center z-10 border border-white/10"
              >
                <X size={20} className="text-white" />
              </button>
              {/* Elemento Decorativo no fundo vermelho */}
              <div className="absolute right-[-20%] bottom-[-50%] w-64 h-64 bg-red-600 rounded-full blur-3xl opacity-50" />
            </div>

            {/* Lista de Frentistas que rola por cima da parte vermelha */}
            <div className="flex-1 overflow-y-auto px-5 pt-28 pb-10 z-20">
              <div className="text-xl font-bold mb-6 text-slate-100 px-2 opacity-90">Quem é você?</div>
              <div className="space-y-3 overflow-y-auto max-h-[60vh] pb-8 px-2 scrollbar-none">
                {frentistas.map((frentista) => (
                  <div
                    key={frentista.id}
                    onClick={() => {
                      setSelectedFrentista(frentista);
                      setIsModalOpen(false);
                    }}
                    className={`w-full text-left px-5 py-4 rounded-xl font-bold tracking-wide transition-all border
                  ${selectedFrentista?.id === frentista.id
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                        : 'bg-[#131722] text-slate-300 border-slate-800/80 hover:bg-slate-800/60 active:bg-slate-800'
                      }`}
                  >
                    {frentista.nome}
                  </div>
                ))}
                {frentistas.length === 0 && <p className="text-slate-400 text-sm italic py-4">Carregando conta dos funcionários...</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F131D] border-t border-slate-800/80 px-6 py-2 flex justify-between items-center z-50 pb-6">
        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <div className="w-14 h-8 rounded-full bg-[#FF756B]/10 flex items-center justify-center">
            <ClipboardList size={20} className="text-[#FF756B]" />
          </div>
          <span className="text-[10px] text-[#FF756B] font-bold tracking-wide">Registro</span>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-50 cursor-pointer">
          <div className="w-14 h-8 flex items-center justify-center">
            <ShoppingBag size={20} className="text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold tracking-wide">Vendas</span>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-50 cursor-pointer">
          <div className="w-14 h-8 flex items-center justify-center">
            <History size={20} className="text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold tracking-wide">Histórico</span>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-50 cursor-pointer">
          <div className="w-14 h-8 flex items-center justify-center">
            <User size={20} className="text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold tracking-wide">Perfil</span>
        </div>
      </div>
    </div>
  );
};

export default App;
