import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { api, amount, name, document } = await request.json();

    if (!api) {
      return NextResponse.json(
        { error: "API é obrigatória" },
        { status: 400 }
      );
    }

    // Busca a API do usuário
    const { data, error } = await supabase
      .from("users")
      .select("api, email, status")
      .eq("api", api)
      .single();

    console.log("Busca usuário:", { data, error });

    if (error || !data) {
      return NextResponse.json(
        { error: "API não encontrada" },
        { status: 404 }
      );
    }

    if (data.status === false) {
      return NextResponse.json(
        { error: "Usuário inativo. Contate o suporte." },
        { status: 403 }
      );
    }

    // Monta o body do pagamento
    const payload = {
      identifier: "pedido_wine" + Date.now(),
      amount: amount,
      client: {
        name: name,
        email: "joao@email.com",
        document: document
      }
    };

    // Faz o fetch para a BoltPagamentos
    const response = await fetch(
      "https://api.boltpagamentos.com.br/api/v1/gateway/pix/receive",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-public-key": 'amandaoliveira2025amanda_1756696279052',
          "x-secret-key": 'd99a9f09-c420-4ae2-a457-34c4633a0d75'
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();
    console.log("Resposta Bolt:", result);

    const email = data.email;

    // Dados que vamos inserir
    const transacaoData = {
      email: email,
      cliente: name,
      pagamento: "PIX",
      data: new Date().toISOString(),
      valor: amount,
      status: "pending",
      code: result.pix.code,
      pedido: payload.identifier,
      hora: new Date().toLocaleTimeString("pt-BR"),
    };

    console.log("Tentando inserir transação:", transacaoData);

    // Insere a transação
    const { data: insertData, error: insertError } = await supabase
      .from('transacoes')
      .insert([transacaoData])
      .select(); // ⚠️ IMPORTANTE: .select() para retornar os dados inseridos

    console.log("Resultado insert:", { insertData, insertError });

    if (insertError) {
      console.error("❌ Erro ao inserir transação:", insertError);
      return NextResponse.json(
        { 
          error: "Erro ao salvar transação", 
          details: insertError.message 
        },
        { status: 500 }
      );
    }

    console.log("✅ Transação inserida com sucesso!");

    return NextResponse.json({
      status: "ok",
      boltResponse: {
        code: result.pix.code, 
        base64: result.pix.base64
      }
    });

  } catch (err) {
    console.error("❌ Erro completo:", err);
    return NextResponse.json(
      { error: "Erro interno", details: err.message },
      { status: 500 }
    );
  }
}