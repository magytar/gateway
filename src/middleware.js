// middleware.ts
import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = req.nextUrl.clone()

  // Rota de login ("/" é sua tela inicial/login)
  const authRoutes = ['/']

  // Se estiver logado e tentar acessar "/", manda pra dashboard
  if (user && authRoutes.includes(url.pathname)) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Rotas protegidas
  const protectedRoutes = ['/dashboard']
  if (!user && protectedRoutes.some(route => url.pathname.startsWith(route))) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return res
}

// ✅ IMPORTANTE: garantir que "/" também passe pelo middleware
export const config = {
  matcher: ['/', '/dashboard/:path*'],
}
