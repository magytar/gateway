"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { UserCircle, ShoppingCart, CreditCard, CheckCircle, Clock, TrendingUp, Filter, Download, Calendar } from "lucide-react";

export default function ModernDashboard() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sales, setSales] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
      } else {
        setUser(user);
        setSales([

        ]);
      }
    };
    getUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!user) return null;

  // Filtrar vendas
  const filteredSales = sales.filter(sale => {
    const statusMatch = filterStatus === "all" || sale.status === filterStatus;
    const paymentMatch = filterPayment === "all" || sale.pagamento === filterPayment;
    return statusMatch && paymentMatch;
  });

  // Cálculos
  const totalVendas = filteredSales.reduce((acc, s) => acc + s.quantidade, 0);
  const totalRecebido = filteredSales.reduce((acc, s) => s.status === "Completed" ? acc + s.quantidade * s.valor : acc, 0);
  const totalPendente = filteredSales.reduce((acc, s) => s.status === "Pending" ? acc + s.quantidade * s.valor : acc, 0);
  const transacoes = filteredSales.length;
  const completed = filteredSales.filter(s => s.status === "Completed").length;
  const pending = filteredSales.filter(s => s.status === "Pending").length;
  const canceled = filteredSales.filter(s => s.status === "Canceled").length;
  
  const totalPix = filteredSales.filter(s => s.pagamento === "PIX" && s.status === "Completed").reduce((acc,s) => acc + s.quantidade*s.valor,0);
  const totalCartao = filteredSales.filter(s => s.pagamento === "Cartão" && s.status === "Completed").reduce((acc,s) => acc + s.quantidade*s.valor,0);

  // Dados do gráfico de barras
  const chartData = [];
  filteredSales.forEach(sale => {
    const existing = chartData.find(c => c.day === sale.data);
    const amount = sale.status === "Completed" ? sale.quantidade * sale.valor : 0;
    if(existing) existing.total += amount;
    else chartData.push({ day: sale.data, total: amount });
  });
  chartData.sort((a, b) => a.day.localeCompare(b.day));

  // Dados do gráfico de pizza (métodos de pagamento)
  const paymentData = [
    { name: "PIX", value: totalPix, color: "#10B981" },
    { name: "Cartão", value: totalCartao, color: "#6366F1" }
  ];

  // Dados do gráfico de status
  const statusData = [
    { name: "Completadas", value: completed, color: "#10B981" },
    { name: "Pendentes", value: pending, color: "#F59E0B" },
    { name: "Canceladas", value: canceled, color: "#EF4444" }
  ];

  const exportToCSV = () => {
    const headers = ["ID", "Produto", "Quantidade", "Valor Unit.", "Total", "Data", "Pagamento", "Status"];
    const rows = filteredSales.map(s => [
      s.id, s.produto, s.quantidade, s.valor, s.quantidade * s.valor, s.data, s.pagamento, s.status
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendas.csv";
    a.click();
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
        {/* Cards principais com animação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl shadow-xl p-6 flex items-center gap-4 hover:scale-105 transform transition-all duration-300 border border-indigo-500/20">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur">
              <ShoppingCart className="w-8 h-8 text-white"/>
            </div>
            <div>
              <span className="text-indigo-200 text-xs uppercase tracking-wider font-semibold">Total Vendas</span>
              <p className="text-3xl font-bold text-white">{totalVendas}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl shadow-xl p-6 flex items-center gap-4 hover:scale-105 transform transition-all duration-300 border border-green-500/20">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur">
              <CreditCard className="w-8 h-8 text-white"/>
            </div>
            <div>
              <span className="text-green-200 text-xs uppercase tracking-wider font-semibold">Recebido</span>
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
            </div>
          </section>

          {/* Gráficos de pizza */}
          <section className="bg-gray-800/50 backdrop-blur rounded-2xl shadow-xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-400"/>
              Métodos de Pagamento
            </h2>
            <div className="w-full h-72">
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
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg"
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
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">ID</th>
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">Produto</th>
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">Qtd</th>
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">Valor Unit.</th>
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">Total</th>
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">Data</th>
                  <th className="border border-gray-600 px-4 py-3 text-left text-sm font-semibold text-gray-200">Pagamento</th>
                  <th className="border border-gray-600 px-4 py-3 text-center text-sm font-semibold text-gray-200">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale, index) => (
                  <tr key={sale.id} className={`${index % 2 === 0 ? "bg-gray-700/30" : "bg-gray-800/30"} hover:bg-gray-600/50 transition-colors`}>
                    <td className="border border-gray-600 px-4 py-3 text-sm text-gray-300">{sale.id}</td>
                    <td className="border border-gray-600 px-4 py-3 text-sm text-gray-200 font-medium">{sale.produto}</td>
                    <td className="border border-gray-600 px-4 py-3 text-sm text-gray-300">{sale.quantidade}</td>
                    <td className="border border-gray-600 px-4 py-3 text-sm text-gray-300">
                      {sale.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="border border-gray-600 px-4 py-3 text-sm text-gray-200 font-semibold">
                      {(sale.quantidade * sale.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="border border-gray-600 px-4 py-3 text-sm text-gray-300">{sale.data}</td>
                    <td className="border border-gray-600 px-4 py-3 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        sale.pagamento === "PIX" ? "bg-green-600/20 text-green-300 border border-green-500/30" : "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                      }`}>
                        {sale.pagamento}
                      </span>
                    </td>
                    <td className="border border-gray-600 px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        sale.status === "Completed" ? "bg-green-600 text-white" :
                        sale.status === "Pending" ? "bg-yellow-500 text-white" :
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
    </div>
  );
}