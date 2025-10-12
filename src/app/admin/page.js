"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminPanel() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginInput, setLoginInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUsers, setSearchUsers] = useState("");
  const [searchTrans, setSearchTrans] = useState("");
  const [activeTab, setActiveTab] = useState("users"); // "users" ou "transactions"

  const ADMIN_LOGIN = process.env.NEXT_PUBLIC_ADMIN_LOGIN;
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginInput === ADMIN_LOGIN && passwordInput === ADMIN_PASSWORD) {
      setLoggedIn(true);
      loadUsers();
      loadTransactions();
    } else {
      alert("Login ou senha incorretos!");
    }
  };

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

  // Função para verificar transação via API BoltPagamentos
async function verifyTransaction(transacao) {
  const confirmAction = confirm(
    `Deseja verificar a transação do pedido ${transacao.pedido}?`
  );
  if (!confirmAction) return;

  try {
    // Chama a rota API do Next.js
    const res = await fetch(`../api/verify-transaction?pedido=${transacao.pedido}`);
    const data = await res.json();

    if (!data.success || !data.data) {
      alert("Transação não encontrada ou erro na API.");
      return;
    }

    if (data.data.status === "COMPLETED") {
      // Atualiza status da transação local e saldo do usuário
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
      const newSaldo = ((userData.saldo ?? 0) + transacao.valor - taxAmount) - 0.50; // Subtrai taxa fixa de 50 centavos

      const { error: saldoError } = await supabase
        .from("users")
        .update({ saldo: newSaldo })
        .eq("id", userData.id);

      if (saldoError) return alert("Erro ao atualizar saldo");

      alert(`Transação ${transacao.pedido} COMPLETED. Saldo atualizado!`);
      loadTransactions();
      loadUsers();
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
  }

  async function updateField(id, field, value) {
    if (isNaN(value)) {
      alert("Digite um número válido!");
      return;
    }

    await supabase.from("users").update({ [field]: parseFloat(value) }).eq("id", id);
    loadUsers();
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
    if (loggedIn) {
      if (activeTab === "users") loadUsers();
      else loadTransactions();
    }
  }, [searchUsers, searchTrans, activeTab, loggedIn]);

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
          <h1 className="text-2xl font-bold mb-4">Login Admin</h1>
          <input
            type="text"
            placeholder="Login"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            className="w-full mb-3 px-3 py-2 border rounded"
          />
          <input
            type="password"
            placeholder="Senha"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full mb-4 px-3 py-2 border rounded"
          />
          <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  if (loading) return <div className="p-4">Carregando...</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Painel Admin</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded ${activeTab === "users" ? "bg-blue-500 text-white" : "bg-gray-300"}`}
        >
          Usuários
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 rounded ${activeTab === "transactions" ? "bg-blue-500 text-white" : "bg-gray-300"}`}
        >
          Transações
        </button>
      </div>

      {/* BUSCA */}
      {activeTab === "users" && (
        <input
          type="text"
          placeholder="Buscar usuário por email..."
          value={searchUsers}
          onChange={(e) => setSearchUsers(e.target.value)}
          className="w-full max-w-md px-3 py-2 border rounded shadow-sm mb-4"
        />
      )}
      {activeTab === "transactions" && (
        <input
          type="text"
          placeholder="Buscar transação por email ou cliente..."
          value={searchTrans}
          onChange={(e) => setSearchTrans(e.target.value)}
          className="w-full max-w-md px-3 py-2 border rounded shadow-sm mb-4"
        />
      )}

      {/* TABELA USUÁRIOS */}
      {activeTab === "users" && (
        <div className="overflow-x-auto bg-white shadow-lg rounded-lg p-4">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Saldo</th>
                <th className="px-4 py-3 text-left">Tax</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">API</th>
                <th className="px-4 py-3 text-left">Pending</th>
                <th className="px-4 py-3 text-left">Completed</th>
                <th className="px-4 py-3 text-left">Ação</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-4 py-3 text-center text-gray-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition border-b last:border-none">
                  <td className="px-4 py-2">{u.id}</td>
                  <td className="px-4 py-2">{u.email}</td>

                  {/* Saldo */}
                  <td className="px-4 py-2">
                    {u.editModeSaldo ? (
                      <div className="flex gap-2 items-center">
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
                          className="border px-2 py-1 rounded w-24"
                        />
                        <button
                          onClick={() => updateField(u.id, "saldo", u.editSaldo)}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => toggleEditMode(u.id, "saldo")}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm px-3 py-1 rounded"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <span>R$ {u.saldo ?? 0}</span>
                        <button
                          onClick={() => toggleEditMode(u.id, "saldo")}
                          className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm px-3 py-1 rounded"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Tax */}
                  <td className="px-4 py-2">
                    {u.editModeTax ? (
                      <div className="flex gap-2 items-center">
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
                          className="border px-2 py-1 rounded w-24"
                        />
                        <button
                          onClick={() => updateField(u.id, "tax", u.editTax)}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => toggleEditMode(u.id, "tax")}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm px-3 py-1 rounded"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <span>{u.tax ?? 0}%</span>
                        <button
                          onClick={() => toggleEditMode(u.id, "tax")}
                          className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm px-3 py-1 rounded"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-2">
                    {u.status ? (
                      <span className="text-green-600 font-semibold">Ativo</span>
                    ) : (
                      <span className="text-red-600 font-semibold">Desativado</span>
                    )}
                  </td>
                  <td className="px-4 py-2 truncate max-w-[200px]">{u.api}</td>
                  <td className="px-4 py-2">{u.pending}</td>
                  <td className="px-4 py-2">{u.completed}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleStatus(u.id, u.status)}
                      className={`px-4 py-2 rounded-md text-white font-medium ${
                        u.status ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                      }`}
                    >
                      {u.status ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TABELA TRANSAÇÕES */}
      {activeTab === "transactions" && (
        <div className="overflow-x-auto bg-white shadow-lg rounded-lg p-4">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Pagamento</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Hora</th>
                <th className="px-4 py-3 text-left">Valor</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Pedido</th>
                <th className="px-4 py-3 text-left">Acao</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-3 text-center text-gray-500">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              )}
              {transactions.map((t, index) => (
                <tr key={index} className="hover:bg-gray-50 transition border-b last:border-none">
                  <td className="px-4 py-2">{t.email}</td>
                  <td className="px-4 py-2">{t.cliente}</td>
                  <td className="px-4 py-2">{t.pagamento}</td>
                  <td className="px-4 py-2">{new Date(t.data).toLocaleString()}</td>
                  <td className="px-4 py-2">{t.hora}</td>
                  <td className="px-4 py-2">R$ {t.valor}</td>
                  <td className="px-4 py-2">{t.status}</td>
                  <td className="px-4 py-2">{t.pedido}</td>

                  <td className="px-4 py-2">
                  {t.status !== "completed" && (
                    <button
                      onClick={() => verifyTransaction(t)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Verificar
                    </button>
                  )}
                </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
