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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // Nova state para busca

  const ADMIN_LOGIN = process.env.NEXT_PUBLIC_ADMIN_LOGIN;
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginInput === ADMIN_LOGIN && passwordInput === ADMIN_PASSWORD) {
      setLoggedIn(true);
      loadUsers();
    } else {
      alert("Login ou senha incorretos!");
    }
  };

  async function loadUsers() {
    let query = supabase.from("users").select("id, email, saldo, status, api, tax");

    if (search) {
      query = query.ilike("email", `%${search}%`);
    }

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

  async function toggleStatus(id, currentStatus) {
    const actionText = currentStatus ? "desativar" : "ativar";
    const confirmAction = confirm(
      `Tem certeza que deseja ${actionText} este usuário?`
    );
    if (!confirmAction) return;

    await supabase
      .from("users")
      .update({ status: !currentStatus })
      .eq("id", id);

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
          if (field === "saldo") {
            return { ...u, editModeSaldo: !u.editModeSaldo, editSaldo: u.saldo };
          } else if (field === "tax") {
            return { ...u, editModeTax: !u.editModeTax, editTax: u.tax ?? 0 };
          }
        }
        return u;
      })
    );
  }

  useEffect(() => {
    if (loggedIn) loadUsers();
  }, [search]);

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded shadow-md w-96"
        >
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
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
          >
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

      {/* Barra de busca */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar usuário por email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border rounded shadow-sm"
        />
      </div>

      <div className="overflow-x-auto bg-white shadow-lg rounded-lg p-4">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Saldo Atual</th>
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
              <tr
                key={u.id}
                className="hover:bg-gray-50 transition border-b last:border-none"
              >
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
                              user.id === u.id
                                ? { ...user, editSaldo: e.target.value }
                                : user
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
                        Editar Saldo
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
                              user.id === u.id
                                ? { ...user, editTax: e.target.value }
                                : user
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
                        Editar Tax
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
                      u.status
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
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
    </div>
  );
}
