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

    // Busca todas as transações do usuário ordenadas por data (mais recentes primeiro)
    const { data, error } = await supabase
      .from("transacoes")
      .select("*")
      .eq("email", email)
      .order("data", { ascending: false });

    if (error) {
      console.error("Erro no Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Retorna array vazio se não houver transações
    return NextResponse.json({ 
      transacoes: data || [],
      total: data?.length || 0
    });

  } catch (err) {
    console.error("Erro na requisição:", err);
    return NextResponse.json({ 
      error: "Erro na requisição",
      details: err.message 
    }, { status: 500 });
  }
}

// Opcional: método GET para buscar transações com query params
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const status = searchParams.get("status");
    const pagamento = searchParams.get("pagamento");
    const limit = searchParams.get("limit") || 100;

    if (!email) {
      return NextResponse.json({ error: "Informe o email" }, { status: 400 });
    }

    let query = supabase
      .from("transacoes")
      .select("*")
      .eq("email", email)
      .order("data", { ascending: false })
      .limit(parseInt(limit));

    // Adiciona filtro de status se fornecido
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Adiciona filtro de método de pagamento se fornecido
    if (pagamento && pagamento !== "all") {
      query = query.eq("pagamento", pagamento);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro no Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      transacoes: data || [],
      total: data?.length || 0
    });

  } catch (err) {
    console.error("Erro na requisição:", err);
    return NextResponse.json({ 
      error: "Erro na requisição",
      details: err.message 
    }, { status: 500 });
  }
}