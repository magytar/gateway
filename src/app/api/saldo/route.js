import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Informe o email" }, { status: 400 });
    }

    // Usa maybeSingle() para evitar erro quando não há resultados
    const { data, error } = await supabase
      .from("users")
      .select("saldo,api,tax,status")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Erro no Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Se não encontrou usuário, retorna saldo 0
    if (!data) {
      return NextResponse.json({ saldo: 0, message: "Usuário não encontrado" });
    }

    return NextResponse.json({ saldo: data.saldo, api: data.api || 0, ativo: data.status, tax: data.tax || 9 });
  } catch (err) {
    console.error("Erro na requisição:", err);
    return NextResponse.json({ error: "Erro na requisição" }, { status: 500 });
  }
}