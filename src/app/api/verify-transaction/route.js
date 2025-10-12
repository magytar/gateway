import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pedido = searchParams.get("pedido");
    if (!pedido) return NextResponse.json({ success: false, message: "Pedido não informado" });

    const res = await fetch(
      `https://boltpagamentos.com.br/api/v1/transactions?externalId=${pedido}`,
      {
        method: "GET",
        headers: {
          "x-public-key": process.env.NEXT_PUBLIC_BOLT_PUBLIC_KEY,
          "x-secret-key": process.env.NEXT_PUBLIC_BOLT_SECRET_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message });
  }
}
