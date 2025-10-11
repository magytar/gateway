"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { UserCircle, ShoppingCart, CreditCard, CheckCircle, Clock, TrendingUp, Filter, Download, Calendar, DollarSign, X, RefreshCw } from "lucide-react";

export default function ModernDashboard() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sales, setSales] = useState([]);
  const [saldo, setSaldo] = useState(0);
  const [loadingSaldo, setLoadingSaldo] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Buscar saldo do usuário via API
  const fetchSaldo = async (email) => {
    try {
      setLoadingSaldo(true);
      const response = await fetch("/api/saldo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSaldo(data.saldo || 0);
      } else {
        console.error("Erro ao buscar saldo:", data.error);
        setSaldo(0);
      }
    } catch (error) {
      console.error("Erro na requisição do saldo:", error);
      setSaldo(0);
    } finally {
      setLoadingSaldo(false);
    }
  };

  // Buscar transações do usuário via API
  const fetchTransacoes = async (email) => {
    try {
      const response = await fetch("/api/transacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Mapeia as transações para o formato esperado pelo dashboard
        const transacoesFormatadas = data.transacoes.map(t => ({
          cliente: t.cliente || "Cliente",
          pagamento: t.pagamento || "PIX",
          data: t.data ? new Date(t.data).toLocaleDateString("pt-BR") : "-",
          valor: parseFloat(t.valor || 0),
          status: t.status || "pending"
        }));
        setSales(transacoesFormatadas);
      } else {
        console.error("Erro ao buscar transações:", data.error);
        setSales([]);
      }
    } catch (error) {
      console.error("Erro na requisição de transações:", error);
      setSales([]);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
      } else {
        setUser(user);
        // Buscar saldo e transações do usuário
        await fetchSaldo(user.email);
        await fetchTransacoes(user.email);
      }
    };
    getUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleRefreshSaldo = () => {
    if (user) {
      fetchSaldo(user.email);
      fetchTransacoes(user.email);
    }
  };

  if (!user) return null;

  // Filtrar vendas
  const filteredSales = sales.filter(sale => {
    const statusMatch = filterStatus === "all" || sale.status === filterStatus;
    const paymentMatch = filterPayment === "all" || sale.pagamento === filterPayment;
    return statusMatch && paymentMatch;
  });

  // Cálculos
  const totalVendas = filteredSales.reduce((acc, s) => acc + s.valor, 0);
  const totalRecebido = filteredSales.reduce((acc, s) => (s.status === "Completed" || s.status === "completed") ? acc + s.valor : acc, 0);
  const totalPendente = filteredSales.reduce((acc, s) => (s.status === "Pending" || s.status === "pending") ? acc + s.valor : acc, 0);
  const transacoes = filteredSales.length;
  const completed = filteredSales.filter(s => s.status === "Completed" || s.status === "completed").length;
  const pending = filteredSales.filter(s => s.status === "Pending" || s.status === "pending").length;
  const canceled = filteredSales.filter(s => s.status === "Canceled" || s.status === "canceled").length;
  
  const totalPix = filteredSales.filter(s => s.pagamento === "PIX" && (s.status === "Completed" || s.status === "completed")).reduce((acc,s) => acc + s.valor,0);
  const totalCartao = filteredSales.filter(s => s.pagamento === "Cartão" && (s.status === "Completed" || s.status === "completed")).reduce((acc,s) => acc + s.valor,0);

  // Dados do gráfico de barras
  const chartData = [];
  filteredSales.forEach(sale => {
    const existing = chartData.find(c => c.day === sale.data);
    const amount = (sale.status === "Completed" || sale.status === "completed") ? sale.valor : 0;
    if(existing) existing.total += amount;
    else chartData.push({ day: sale.data, total: amount });
  });
  chartData.sort((a, b) => a.day.localeCompare(b.day));

  // Dados do gráfico de pizza (métodos de pagamento)
  const paymentData = [
    { name: "PIX", value: totalPix, color: "#10B981" },
    { name: "Cartão", value: totalCartao, color: "#6366F1" }
  ];

  const exportToCSV = () => {
    const headers = ["Cliente", "Pagamento", "Data", "Valor", "Status"];
    const rows = filteredSales.map(s => [
      s.cliente, s.pagamento, s.data, s.valor, s.status
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendas.csv";
    a.click();
  };

  const handleWhatsAppWithdraw = () => {
    const whatsappNumber = "5519994378031";
    const message = `Olá! Gostaria de solicitar um saque.\n\nSaldo disponível: ${saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\n\nEmail: ${user?.email}`;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      {/* Header com glassmorphism */}
      <header className="bg-gray-800/50 backdrop-blur-md shadow-lg border-b border-gray-700/50 py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white"/>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Dashboard de Vendas
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-2 rounded-full hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4"/>
              Solicitar Saque
            </button>
            <div className="flex items-center gap-2 bg-gray-700/50 backdrop-blur px-4 py-2 rounded-full border border-gray-600/50">
              <UserCircle className="w-5 h-5 text-indigo-400"/>
              <span className="text-gray-200 text-sm">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-2 rounded-full hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-105 shadow-lg"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Card de Saldo Disponível (destaque) */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl shadow-2xl p-8 border border-green-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm uppercase tracking-wider font-semibold mb-2">
                Saldo Disponível para Saque
              </p>
              {loadingSaldo ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-8 h-8 text-white animate-spin" />
                  <p className="text-2xl text-white">Carregando...</p>
                </div>
              ) : (
                <p className="text-5xl font-bold text-white">
                  {saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              )}
            </div>
            <button
              onClick={handleRefreshSaldo}
              disabled={loadingSaldo}
              className="bg-white/20 hover:bg-white/30 p-3 rounded-xl backdrop-blur transition-all disabled:opacity-50"
              title="Atualizar saldo"
            >
              <RefreshCw className={`w-5 h-5 text-white ${loadingSaldo ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Cards principais com animação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl shadow-xl p-6 flex items-center gap-4 hover:scale-105 transform transition-all duration-300 border border-indigo-500/20">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur">
              <ShoppingCart className="w-8 h-8 text-white"/>
            </div>
            <div>
              <span className="text-indigo-200 text-xs uppercase tracking-wider font-semibold">Total Vendas</span>
              <p className="text-3xl font-bold text-white">
                {totalVendas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 flex items-center gap-4 hover:scale-105 transform transition-all duration-300 border border-blue-500/20">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur">
              <CreditCard className="w-8 h-8 text-white"/>
            </div>
            <div>
              <span className="text-blue-200 text-xs uppercase tracking-wider font-semibold">Recebido</span>
              <p className="text-2xl font-bold text-white">
                {totalRecebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-xl p-6 flex items-center gap-4 hover:scale-105 transform transition-all duration-300 border border-yellow-400/20">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur">
              <CheckCircle className="w-8 h-8 text-white"/>
            </div>
            <div>
              <span className="text-yellow-100 text-xs uppercase tracking-wider font-semibold">Completadas</span>
              <p className="text-3xl font-bold text-white">{completed}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 flex items-center gap-4 hover:scale-105 transform transition-all duration-300 border border-orange-400/20">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur">
              <Clock className="w-8 h-8 text-white"/>
            </div>
            <div>
              <span className="text-orange-100 text-xs uppercase tracking-wider font-semibold">Pendentes</span>
              <p className="text-3xl font-bold text-white">{pending}</p>
              <span className="text-orange-200 text-xs">
                {totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          </div>
        </div>

        {/* Gráficos lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de barras */}
          <section className="bg-gray-800/50 backdrop-blur rounded-2xl shadow-xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400"/>
              Receita por Dia
            </h2>
            <div className="w-full h-72">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <XAxis dataKey="day" stroke="#9CA3AF" style={{ fontSize: '12px' }}/>
                    <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }}/>
                    <Tooltip 
                      formatter={(value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                    <Bar dataKey="total" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </section>

          {/* Gráficos de pizza */}
          <section className="bg-gray-800/50 backdrop-blur rounded-2xl shadow-xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-400"/>
              Métodos de Pagamento
            </h2>
            <div className="w-full h-72">
              {paymentData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Filtros e exportação */}
        <section className="bg-gray-800/50 backdrop-blur rounded-2xl shadow-xl p-6 border border-gray-700/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-400"/>
              Detalhes de Vendas
            </h2>
            <div className="flex flex-wrap gap-3">
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">Todos Status</option>
                <option value="Completed">Completadas</option>
                <option value="Pending">Pendentes</option>
                <option value="pending">pendentes</option>
                <option value="Error">Error</option>
                <option value="Canceled">Canceladas</option>
              </select>
              
              <select 
                value={filterPayment} 
                onChange={(e) => setFilterPayment(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">Todos Pagamentos</option>
                <option value="PIX">PIX</option>
                <option value="Cartão">Cartão</option>
              </select>
              
              <button
                onClick={exportToCSV}
                disabled={filteredSales.length === 0}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4"/>
                Exportar CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] table-auto border-collapse">
              <thead>
                <tr className="bg-gray-700/50">
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">CLIENTE</th>
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">PAGAMENTO</th>
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">DATA</th>
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">VALOR</th>
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">STATUS</th>  
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? "bg-gray-700/30" : "bg-gray-800/30"} hover:bg-gray-600/50 transition-colors`}>
                    <td className="border border-gray-600 px-4 py-3 text-sm text-gray-300">{sale.cliente}</td>
                    <td className="border border-gray-600 px-4 py-3 text-sm text-gray-200 font-medium">{sale.pagamento}</td>
                    <td className="border border-gray-600 px-4 py-3 text-sm text-gray-300">{sale.data}</td>
                    <td className="border border-gray-600 px-4 py-3 text-sm text-gray-300">
                      {sale.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="border border-gray-600 px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        sale.status === "Completed" || sale.status === "completed" ? "bg-green-600 text-white" :
                        sale.status === "Pending" || sale.status === "pending" ? "bg-yellow-500 text-white" :
                        sale.status === "Error" || sale.status === "error" ? "bg-red-500 text-white" :
                        "bg-red-600 text-white"
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredSales.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              Nenhuma venda encontrada com os filtros selecionados.
            </div>
          )}
        </section>
      </main>

      {/* Modal de Saque */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-700/50 transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <DollarSign className="w-7 h-7 text-green-400"/>
                Solicitar Saque
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6"/>
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-600/20 to-green-700/20 border border-green-500/30 rounded-xl p-6">
                <p className="text-gray-300 text-sm mb-2">Saldo disponível para saque:</p>
                {loadingSaldo ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-green-400 animate-spin" />
                    <p className="text-2xl text-green-400">Carregando...</p>
                  </div>
                ) : (
                  <p className="text-4xl font-bold text-green-400">
                    {saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                )}
              </div>

              <div className="bg-gray-700/30 rounded-xl p-5 border border-gray-600/50">
                <p className="text-gray-300 text-sm leading-relaxed">
                  Para solicitar seu saque, clique no botão abaixo e envie uma mensagem via WhatsApp. 
                  Nossa equipe processará sua solicitação em até 24 horas úteis.
                </p>
              </div>

              <button
                onClick={handleWhatsAppWithdraw}
                disabled={saldo <= 0 || loadingSaldo}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 shadow-lg font-semibold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Solicitar via WhatsApp
              </button>

              <button
                onClick={() => setShowWithdrawModal(false)}
                className="w-full bg-gray-700 text-gray-300 px-6 py-3 rounded-xl hover:bg-gray-600 transition-all font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}