// middleware.js ou middleware.ts
import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Pega o usuário logado
  const { data: { user } } = await supabase.auth.getUser()

  const url = req.nextUrl.clone()

  // Rotas de login e registro
  const authRoutes = ['/']

  // Se o usuário estiver logado e tentar acessar login/register
  if (user && authRoutes.includes(url.pathname)) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Se o usuário não estiver logado e tentar acessar rotas protegidas
  const protectedRoutes = ['/dashboard']
  if (!user && protectedRoutes.some(route => url.pathname.startsWith(route))) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return res
}

// Configura quais rotas passam pelo middleware
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'], 
}
