import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Validação básica
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Validação de senha mínima
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 400 }
      );
    }

    // 2. Criar registro na tabela users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          email: email.toLowerCase(),
          saldo: 0,
          status: false,
        }
      ])
      .select()
      .single();

    if (userError) {
      console.error('Erro ao criar usuário na tabela users:', userError);
      
      // Se falhar ao criar na tabela, tentar deletar o usuário do Auth
      // (isso requer permissões administrativas, pode não funcionar)
      return NextResponse.json(
        { 
          error: 'Erro ao criar perfil do usuário',
          details: userError.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Usuário criado com sucesso! Verifique seu email para confirmar.',
        user: {
          id: userData.id,
          email: userData.email,
          saldo: userData.saldo,
          status: userData.status,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Erro no registro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}

// Método GET para verificar se a rota está ativa
export async function GET() {
  return NextResponse.json(
    { message: 'API de registro ativa' },
    { status: 200 }
  );
}