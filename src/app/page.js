"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Mail, Lock, UserPlus, LogIn, TrendingUp, AlertCircle, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function AuthPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email || !password || (!isLogin && !confirm)) {
      setError("Preencha todos os campos");
      setLoading(false);
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Email inválido");
      setLoading(false);
      return;
    }

    // Validação de senha
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      setLoading(false);
      return;
    }

    if (!isLogin && password !== confirm) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Login
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });

        if (signInError) {
          setError(signInError.message === "Invalid login credentials" 
            ? "Email ou senha incorretos" 
            : signInError.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          router.push("/dashboard");
        }
      } else {
        // Registro - usar a API route
        const response = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Erro ao criar conta");
          setLoading(false);
          return;
        }

        // Sucesso no registro
        setSuccess(data.message || "Conta criada com sucesso!");
        
        // Limpar campos
        setEmail("");
        setPassword("");
        setConfirm("");
        
        // Opcional: fazer login automático após registro
        setTimeout(async () => {
          const { error: signInError } = await supabase.auth.signInWithPassword({ 
            email: data.user.email, 
            password 
          });
          
          if (!signInError) {
            router.push("/dashboard");
          } else {
            // Se não conseguir fazer login automático, mudar para tela de login
            setIsLogin(true);
            setSuccess("Conta criada! Faça login para continuar.");
          }
        }, 1500);
      }
    } catch (err) {
      console.error("Erro:", err);
      setError("Erro ao processar solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4 transform hover:scale-110 transition-transform">
            <TrendingUp className="w-8 h-8 text-white"/>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Gateway MR
          </h1>
          <p className="text-gray-400 mt-2">Venda Rapido e Segura</p>
        </div>

        {/* Card de autenticação */}
        <div className="bg-gray-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-gray-700/50">
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-gray-700/50 rounded-xl p-1">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError("");
                  setSuccess("");
                }}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  isLogin
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError("");
                  setSuccess("");
                }}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  !isLogin
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Registrar
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6 text-center text-white">
            {isLogin ? "Bem-vindo de volta!" : "Criar nova conta"}
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0"/>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5 flex-shrink-0"/>
              <p className="text-sm">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Email input */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"/>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="w-full pl-11 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Password input */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"/>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="w-full pl-11 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
              </button>
            </div>

            {/* Confirm password input */}
            {!isLogin && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"/>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirme a senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                  className="w-full pl-11 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                </button>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Carregando...</span>
                </>
              ) : (
                <>
                  {isLogin ? (
                    <>
                      <LogIn className="w-5 h-5"/>
                      <span>Entrar</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5"/>
                      <span>Registrar</span>
                    </>
                  )}
                </>
              )}
            </button>
          </div>

          {/* Toggle entre Login e Registro */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setSuccess("");
                  setEmail("");
                  setPassword("");
                  setConfirm("");
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                {isLogin ? "Criar conta" : "Fazer login"}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>© 2025 Gateway de Vendas. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}