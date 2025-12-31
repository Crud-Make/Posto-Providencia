import React, { useState, useEffect } from "react";
import {
  Fuel,
  Plus,
  Edit2,
  Trash2,
  Sun,
  Sunset,
  Moon,
  History,
  Save,
  Sliders,
  Loader2,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  fetchSettingsData,
  formaPagamentoService,
  configuracaoService,
  turnoService,
} from "../services/api";
import { usePosto } from "../contexts/PostoContext";
import {
  ProductConfig,
  NozzleConfig,
  ShiftConfig,
  PaymentMethodConfig,
} from "../types";
import { TankManagement } from "./TankManagement";

const SettingsScreen: React.FC = () => {
  const { postoAtivoId } = usePosto();
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductConfig[]>([]);
  const [nozzles, setNozzles] = useState<NozzleConfig[]>([]);
  const [shifts, setShifts] = useState<ShiftConfig[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(
    [],
  );
  const [tolerance, setTolerance] = useState("50.00");

  // Configurações financeiras

  const [diasEstoqueCritico, setDiasEstoqueCritico] = useState("3");
  const [diasEstoqueBaixo, setDiasEstoqueBaixo] = useState("7");
  const [configsModified, setConfigsModified] = useState(false);
  const [shiftsModified, setShiftsModified] = useState(false);

  // Estado para modal de pagamento
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] =
    useState<PaymentMethodConfig | null>(null);
  const [paymentForm, setPaymentForm] = useState<Partial<PaymentMethodConfig>>({
    name: "",
    type: "outros",
    tax: 0,
    active: true,
  });

  // Função para abrir modal (criar ou editar)
  const openPaymentModal = (method?: PaymentMethodConfig) => {
    if (method) {
      setEditingPayment(method);
      setPaymentForm({
        name: method.name,
        type: method.type,
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

  // Função para salvar forma de pagamento
  const handleSavePayment = async () => {
    if (!paymentForm.name) return alert("Nome é obrigatório");

    try {
      if (editingPayment) {
        // Update
        const updated = await formaPagamentoService.update(
          Number(editingPayment.id),
          {
            nome: paymentForm.name,
            tipo: paymentForm.type,
            taxa: paymentForm.tax,
            ativo: paymentForm.active,
          },
        );

        setPaymentMethods((prev) =>
          prev.map((p) =>
            p.id === editingPayment.id
              ? {
                ...p,
                name: updated.nome,
                type: updated.tipo as any,
                tax: updated.taxa || 0,
                active: updated.ativo || false,
              }
              : p,
          ),
        );
      } else {
        // Create
        const created = await formaPagamentoService.create({
          nome: paymentForm.name!,
          tipo: paymentForm.type || "outros",
          taxa: paymentForm.tax || 0,
          ativo: paymentForm.active,
          posto_id: postoAtivoId || 1,
        });


        setPaymentMethods((prev) => [
          ...prev,
          {
            id: String(created.id),
            name: created.nome,
            type: created.tipo as any,
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

  // Função para salvar configurações financeiras
  const handleSaveConfigs = async () => {
    setSaving(true);
    try {
      await Promise.all([

        configuracaoService.update("tolerancia_divergencia", tolerance, postoAtivoId),
        configuracaoService.update("dias_estoque_critico", diasEstoqueCritico, postoAtivoId),
        configuracaoService.update("dias_estoque_baixo", diasEstoqueBaixo, postoAtivoId),
      ]);

      setConfigsModified(false);
      alert("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações", error);
      alert("Erro ao salvar configurações. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Função para salvar turnos
  const handleSaveShifts = async () => {
    setSaving(true);
    try {
      await Promise.all(
        shifts.map((shift) =>
          turnoService.update(Number(shift.id), {
            nome: shift.name,
            horario_inicio: shift.start,
            horario_fim: shift.end,
          }),
        ),
      );
      setShiftsModified(false);
      alert("Turnos atualizados com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar turnos", error);
      alert("Erro ao salvar turnos. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [data, configs] = await Promise.all([
          fetchSettingsData(postoAtivoId),
          configuracaoService.getAll(postoAtivoId).catch(() => []),
        ]);


        setProducts(data.products);
        setNozzles(data.nozzles);
        setShifts(data.shifts);
        setPaymentMethods(data.paymentMethods || []);

        // Carregar configurações do banco

        const tol = configs.find((c) => c.chave === "tolerancia_divergencia");
        const diasCrit = configs.find(
          (c) => c.chave === "dias_estoque_critico",
        );
        const diasBaixo = configs.find((c) => c.chave === "dias_estoque_baixo");

        if (tol) setTolerance(tol.valor);
        if (diasCrit) setDiasEstoqueCritico(diasCrit.valor);
        if (diasBaixo) setDiasEstoqueBaixo(diasBaixo.valor);
      } catch (error) {
        console.error("Failed to fetch settings", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [postoAtivoId]);


  const getProductTypeStyle = (type: string) => {
    switch (type) {
      case "Combustível":
        return "bg-yellow-100 text-yellow-700";
      case "Biocombustível":
        return "bg-green-100 text-green-700";
      case "Diesel":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getShiftIcon = (type: string) => {
    switch (type) {
      case "sun":
        return <Sun size={18} className="text-yellow-500" />;
      case "sunset":
        return <Sunset size={18} className="text-orange-500" />;
      case "moon":
        return <Moon size={18} className="text-blue-500" />;
      default:
        return <Sun size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full text-blue-600">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
            Configurações do Posto
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Defina produtos, bicos, turnos e parâmetros operacionais.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            <History size={18} />
            <span>Log de Alterações</span>
          </button>
          <button className="flex items-center gap-2 px-4 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors shadow-lg shadow-blue-500/20">
            <Save size={18} />
            <span>Salvar Todas Alterações</span>
          </button>
        </div>
      </div>

      {/* Tank Management Section */}
      <TankManagement />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column (Products & Nozzles) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Products Management */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Fuel className="text-blue-600 dark:text-blue-500" size={24} />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Gestão de Produtos
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cadastre combustíveis e produtos da pista.
                  </p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                <Plus size={14} /> ADICIONAR
              </button>
            </div>
            <div className="overflow-x-auto">
              {products.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhum produto cadastrado.
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Nome do Produto</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4 text-right">
                        Valor / Litro (R$)
                      </th>
                      <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                          {product.name}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${getProductTypeStyle(product.type)}`}
                          >
                            {product.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-gray-900 dark:text-gray-100 font-bold">
                          {product.price.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
                            <button className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Nozzles Management */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Fuel
                    className="text-blue-600 dark:text-blue-500"
                    size={24}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5">
                    <div className="size-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Gestão de Bicos
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Associe bicos aos tanques e produtos.
                  </p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                <Plus size={14} /> ADICIONAR
              </button>
            </div>
            <div className="overflow-x-auto">
              {nozzles.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Nenhum bico configurado.
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Nº do Bico</th>
                      <th className="px-6 py-4">Produto Vinculado</th>
                      <th className="px-6 py-4">Tanque de Origem</th>
                      <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {nozzles.map((nozzle) => (
                      <tr
                        key={nozzle.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="size-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-sm text-gray-700 dark:text-gray-200">
                            {nozzle.number}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-medium">
                          {nozzle.productName}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {nozzle.tankSource}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
                            <button className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button className="hover:text-red-600 dark:hover:text-red-400 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Payment Methods Management */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                <Sliders size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Formas de Pagamento
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Taxas e prazos para o fluxo de caixa.
                </p>
              </div>
            </div>
            <button
              onClick={() => openPaymentModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold rounded hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <Plus size={14} /> ADICIONAR
            </button>
          </div>
          <div className="overflow-x-auto">
            {paymentMethods.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Nenhuma forma de pagamento configurada.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4 text-right">Taxa (%)</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paymentMethods.map((method) => (
                    <tr
                      key={method.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                        {method.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {method.type === "cartao_credito"
                            ? "Crédito"
                            : method.type === "cartao_debito"
                              ? "Débito"
                              : method.type === "pix"
                                ? "PIX"
                                : method.type === "dinheiro"
                                  ? "Dinheiro"
                                  : "Outros"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-900 dark:text-gray-100 font-bold">
                        {method.tax.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${method.active ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}
                        >
                          {method.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
                          <button
                            onClick={() => openPaymentModal(method)}
                            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            onClick={() => {
                              if (window.confirm("Deseja realmente excluir?")) {
                                formaPagamentoService
                                  .delete(Number(method.id))
                                  .then(() => {
                                    setPaymentMethods((prev) =>
                                      prev.filter((p) => p.id !== method.id),
                                    );
                                  });
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Right Column (Shifts & Params) */}
      <div className="lg:col-span-1 space-y-8">
        {/* Shifts Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                Configuração de Turnos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-1">
                Defina os horários operacionais de cada equipe.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {shifts.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                Nenhum turno configurado.
              </p>
            ) : (
              shifts.map((shift, index) => (
                <div
                  key={shift.id}
                  className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {getShiftIcon(shift.iconType)}
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {shift.name}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mb-1 block">
                        Início
                      </label>
                      <input
                        type="time"
                        value={shift.start}
                        onChange={(e) => {
                          const newShifts = [...shifts];
                          newShifts[index].start = e.target.value;
                          setShifts(newShifts);
                          setShiftsModified(true);
                        }}
                        className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mb-1 block">
                        Fim
                      </label>
                      <input
                        type="time"
                        value={shift.end}
                        onChange={(e) => {
                          const newShifts = [...shifts];
                          newShifts[index].end = e.target.value;
                          setShifts(newShifts);
                          setShiftsModified(true);
                        }}
                        className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}

            {shiftsModified && (
              <button
                onClick={handleSaveShifts}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50 mt-2"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? "Salvando..." : "Salvar Horários"}
              </button>
            )}
          </div>
        </div>

        {/* Closing Parameters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                Parâmetros do Fechamento
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-1">
                Regras para a validação do caixa.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                Tolerância de Divergência (R$)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Valor máximo aceito sem alerta crítico.
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={tolerance}
                  onChange={(e) => {
                    setTolerance(e.target.value);
                    setConfigsModified(true);
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configurações Financeiras - NOVO */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                Configurações Financeiras
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-1">
                Parâmetros para análise de custos e margens.
              </p>
            </div>
          </div>

          <div className="space-y-4">

          </div>
        </div>

        {/* Parâmetros de Estoque */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                Alertas de Estoque
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-1">
                Defina os limites para alertas de estoque.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                Dias para Estoque Crítico
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Quantidade de dias de estoque para disparar alerta crítico.
              </p>
              <input
                type="number"
                step="1"
                min="1"
                value={diasEstoqueCritico}
                onChange={(e) => {
                  setDiasEstoqueCritico(e.target.value);
                  setConfigsModified(true);
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                Dias para Estoque Baixo
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Quantidade de dias de estoque para exibir alerta de atenção.
              </p>
              <input
                type="number"
                step="1"
                min="1"
                value={diasEstoqueBaixo}
                onChange={(e) => {
                  setDiasEstoqueBaixo(e.target.value);
                  setConfigsModified(true);
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Botão de Salvar Configurações */}
        {configsModified && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp
                size={20}
                className="text-green-600 dark:text-green-400"
              />
              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                Você tem alterações não salvas nas configurações.
              </span>
            </div>
            <button
              onClick={handleSaveConfigs}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        )}

        {/* Payment Method Modal */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 m-4 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingPayment
                    ? "Editar Forma de Pagamento"
                    : "Nova Forma de Pagamento"}
                </h3>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={paymentForm.name}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Ex: Cartão Visa Crédito"
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={paymentForm.type}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        type: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="pix">PIX</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Taxa (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentForm.tax}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          tax: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none pr-8 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400 font-bold">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Percentual descontado do valor bruto.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activeCheck"
                    checked={paymentForm.active}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        active: e.target.checked,
                      }))
                    }
                    className="size-4 rounded text-green-600 focus:ring-green-500"
                  />
                  <label
                    htmlFor="activeCheck"
                    className="text-sm text-gray-700 dark:text-gray-300 font-medium"
                  >
                    Ativo
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePayment}
                  className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsScreen;
