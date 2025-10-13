"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Search, Users, CreditCard, LogOut, RefreshCw, Edit2, Save, X, CheckCircle, XCircle, Eye, EyeOff, TrendingUp, DollarSign, Activity } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminPanel() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchTrans, setSearchTrans] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    completedTransactions: 0,
    totalRevenue: 0
  });

  const ADMIN_LOGIN = process.env.NEXT_PUBLIC_ADMIN_LOGIN;
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginInput === ADMIN_LOGIN && passwordInput === ADMIN_PASSWORD) {
      setLoggedIn(true);
      loadDashboardStats();
      loadUsers();
      loadTransactions();
    } else {
      alert("Login ou senha incorretos!");
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setLoginInput("");
    setPasswordInput("");
  };

  // === DASHBOARD STATS ===
  async function loadDashboardStats() {
    const { data: usersData } = await supabase.from("users").select("status, saldo");
    const { data: transData } = await supabase.from("transacoes").select("status, valor");

    const totalUsers = usersData?.length || 0;
    const activeUsers = usersData?.filter(u => u.status)?.length || 0;
    const totalTransactions = transData?.length || 0;
    const pendingTransactions = transData?.filter(t => t.status === "pending")?.length || 0;
    const completedTransactions = transData?.filter(t => t.status === "completed")?.length || 0;
    const totalRevenue = transData?.filter(t => t.status === "completed")?.reduce((acc, t) => acc + (t.valor || 0), 0) || 0;

    setStats({
      totalUsers,
      activeUsers,
      totalTransactions,
      pendingTransactions,
      completedTransactions,
      totalRevenue
    });
  }

  // === USERS ===
  async function loadUsers() {
    setLoading(true);
    let query = supabase.from("users").select("id, email, saldo, status, api, tax");
    if (searchUsers) query = query.ilike("email", `%${searchUsers}%`);

    const { data: usersData, error: usersError } = await query;
    if (usersError) {
      console.error(usersError);
      setLoading(false);
      return;
    }

    const usersWithTransactions = await Promise.all(
      usersData.map(async (user) => {
        const { count: pendingCount } = await supabase
          .from("transacoes")
          .select("*", { count: "exact", head: true })
          .eq("email", user.email)
          .eq("status", "pending");

        const { count: completedCount } = await supabase
          .from("transacoes")
          .select("*", { count: "exact", head: true })
          .eq("email", user.email)
          .eq("status", "completed");

        return {
          ...user,
          pending: pendingCount ?? 0,
          completed: completedCount ?? 0,
          editModeSaldo: false,
          editSaldo: user.saldo,
          editModeTax: false,
          editTax: user.tax ?? 0,
        };
      })
    );

    setUsers(usersWithTransactions);
    setLoading(false);
  }

  async function verifyTransaction(transacao) {
    const confirmAction = confirm(
      `Deseja verificar a transação do pedido ${transacao.pedido}?`
    );
    if (!confirmAction) return;

    try {
      const res = await fetch(`../api/verify-transaction?pedido=${transacao.pedido}`);
      const data = await res.json();

      if (!data.success || !data.data) {
        alert("Transação não encontrada ou erro na API.");
        return;
      }

      if (data.data.status === "COMPLETED") {
        const { error: updateError } = await supabase
          .from("transacoes")
          .update({ status: "completed" })
          .eq("pedido", transacao.pedido);

        if (updateError) return alert("Erro ao atualizar transação: " + updateError.message);

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, saldo, tax")
          .eq("email", transacao.email)
          .maybeSingle();

        if (userError || !userData) return alert("Erro ao buscar usuário");

        const taxAmount = (userData.tax ?? 0) / 100 * transacao.valor;
        const newSaldo = ((userData.saldo ?? 0) + transacao.valor - taxAmount) - 0.50;

        const { error: saldoError } = await supabase
          .from("users")
          .update({ saldo: newSaldo })
          .eq("id", userData.id);

        if (saldoError) return alert("Erro ao atualizar saldo");

        alert(`Transação ${transacao.pedido} COMPLETED. Saldo atualizado!`);
        loadTransactions();
        loadUsers();
        loadDashboardStats();
      } else {
        alert(`Transação ${transacao.pedido} não está COMPLETED ainda. Status atual: ${data.data.status}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao verificar transação: " + err.message);
    }
  }

  async function toggleStatus(id, currentStatus) {
    const actionText = currentStatus ? "desativar" : "ativar";
    const confirmAction = confirm(`Tem certeza que deseja ${actionText} este usuário?`);
    if (!confirmAction) return;

    await supabase.from("users").update({ status: !currentStatus }).eq("id", id);
    loadUsers();
    loadDashboardStats();
  }

  async function updateField(id, field, value) {
    if (isNaN(value)) {
      alert("Digite um número válido!");
      return;
    }

    await supabase.from("users").update({ [field]: parseFloat(value) }).eq("id", id);
    loadUsers();
    loadDashboardStats();
  }

  function toggleEditMode(id, field) {
    setUsers(
      users.map((u) => {
        if (u.id === id) {
          if (field === "saldo") return { ...u, editModeSaldo: !u.editModeSaldo, editSaldo: u.saldo };
          if (field === "tax") return { ...u, editModeTax: !u.editModeTax, editTax: u.tax ?? 0 };
        }
        return u;
      })
    );
  }

  // === TRANSACTIONS ===
  async function loadTransactions() {
    setLoading(true);
    let query = supabase
      .from("transacoes")
      .select("email, cliente, pagamento, data, valor, status, pedido, hora")
      .order("data", { ascending: false });

    if (searchTrans) query = query.or(`email.ilike.%${searchTrans}%,cliente.ilike.%${searchTrans}%`);

    const { data, error } = await query;
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setTransactions(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!loggedIn) return;
    const timer = setTimeout(() => {
      loadUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchUsers, loggedIn]);

  useEffect(() => {
    if (!loggedIn) return;
    const timer = setTimeout(() => {
      loadTransactions();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTrans, loggedIn]);

  useEffect(() => {
    if (!loggedIn) return;
    if (activeTab === "users") {
      loadUsers();
    } else if (activeTab === "transactions") {
      loadTransactions();
    } else if (activeTab === "dashboard") {
      loadDashboardStats();
    }
  }, [activeTab]);

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
        <div className="w-full max-w-md px-4">
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
              <p className="text-gray-500 mt-2">Faça login para continuar</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Login</label>
                <input
                  type="text"
                  placeholder="Digite seu login"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-lg transform transition hover:scale-105"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition whitespace-nowrap ${
                activeTab === "dashboard"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition whitespace-nowrap ${
                activeTab === "users"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Usuários</span>
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition whitespace-nowrap ${
                activeTab === "transactions"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span>Transações</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Total Usuários</p>
                        <p className="text-3xl font-bold mt-2">{stats.totalUsers}</p>
                        <p className="text-blue-100 text-sm mt-1">{stats.activeUsers} ativos</p>
                      </div>
                      <Users className="w-12 h-12 text-blue-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Receita Total</p>
                        <p className="text-3xl font-bold mt-2">R$ {stats.totalRevenue.toFixed(2)}</p>
                        <p className="text-green-100 text-sm mt-1">{stats.completedTransactions} completadas</p>
                      </div>
                      <DollarSign className="w-12 h-12 text-green-200" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm">Transações</p>
                        <p className="text-3xl font-bold mt-2">{stats.totalTransactions}</p>
                        <p className="text-orange-100 text-sm mt-1">{stats.pendingTransactions} pendentes</p>
                      </div>
                      <TrendingUp className="w-12 h-12 text-orange-200" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Resumo Geral</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Taxa de Conclusão</span>
                      <span className="font-semibold text-gray-800">
                        {stats.totalTransactions > 0 
                          ? ((stats.completedTransactions / stats.totalTransactions) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Usuários Ativos</span>
                      <span className="font-semibold text-gray-800">
                        {stats.totalUsers > 0 
                          ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Valor Médio por Transação</span>
                      <span className="font-semibold text-gray-800">
                        R$ {stats.completedTransactions > 0 
                          ? (stats.totalRevenue / stats.completedTransactions).toFixed(2)
                          : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar usuário por email..."
                      value={searchUsers}
                      onChange={(e) => setSearchUsers(e.target.value)}
                      className="flex-1 px-3 py-2 border-0 focus:ring-0 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxa</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trans.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                              Nenhum usuário encontrado
                            </td>
                          </tr>
                        ) : (
                          users.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3 text-sm text-gray-900">{u.email}</td>
                              <td className="px-4 py-3">
                                {u.editModeSaldo ? (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="number"
                                      value={u.editSaldo}
                                      onChange={(e) =>
                                        setUsers(
                                          users.map((user) =>
                                            user.id === u.id ? { ...user, editSaldo: e.target.value } : user
                                          )
                                        )
                                      }
                                      className="w-24 px-2 py-1 text-sm border rounded"
                                    />
                                    <button
                                      onClick={() => updateField(u.id, "saldo", u.editSaldo)}
                                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => toggleEditMode(u.id, "saldo")}
                                      className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-900">R$ {u.saldo ?? 0}</span>
                                    <button
                                      onClick={() => toggleEditMode(u.id, "saldo")}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {u.editModeTax ? (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="number"
                                      value={u.editTax}
                                      onChange={(e) =>
                                        setUsers(
                                          users.map((user) =>
                                            user.id === u.id ? { ...user, editTax: e.target.value } : user
                                          )
                                        )
                                      }
                                      className="w-20 px-2 py-1 text-sm border rounded"
                                    />
                                    <button
                                      onClick={() => updateField(u.id, "tax", u.editTax)}
                                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => toggleEditMode(u.id, "tax")}
                                      className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-900">{u.tax ?? 0}%</span>
                                    <button
                                      onClick={() => toggleEditMode(u.id, "tax")}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {u.status ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Ativo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Inativo
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="flex flex-col">
                                  <span className="text-green-600">{u.completed} ✓</span>
                                  <span className="text-orange-600">{u.pending} ⏱</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => toggleStatus(u.id, u.status)}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                                    u.status
                                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                                      : "bg-green-100 text-green-700 hover:bg-green-200"
                                  }`}
                                >
                                  {u.status ? "Desativar" : "Ativar"}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === "transactions" && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar transação por email ou cliente..."
                      value={searchTrans}
                      onChange={(e) => setSearchTrans(e.target.value)}
                      className="flex-1 px-3 py-2 border-0 focus:ring-0 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {transactions.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                              Nenhuma transação encontrada
                            </td>
                          </tr>
                        ) : (
                          transactions.map((t, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3 text-sm text-gray-900">{t.email}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{t.cliente}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="flex flex-col">
                                  <span>{t.data ? new Date(t.data).toLocaleDateString("pt-BR") : "-"}</span>
                                  <span className="text-xs text-gray-400">{t.hora}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                R$ {t.valor}
                              </td>
                              <td className="px-4 py-3">
                                {t.status === "completed" ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Completo
                                  </span>
                                ) : t.status === "pending" ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Pendente
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {t.status}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {t.pedido}
                              </td>
                              <td className="px-4 py-3">
                                {t.status !== "completed" && (
                                  <button
                                    onClick={() => verifyTransaction(t)}
                                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-medium transition"
                                  >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Verificar
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}