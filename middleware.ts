import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token

    // 페이지 접근과 API 라우트가 동일한 관리자 기준(isAdminEmail)을 쓰도록 통일한다.
    // 이전에는 ADMIN_EMAIL 환경변수 하나만 비교해서, 환경변수가 없으면
    // 어떤 관리자도 /admin 에 들어갈 수 없었다.
    if (req.nextUrl.pathname.startsWith('/admin')) {
      if (!isAdminEmail(token?.email)) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/admin/:path*'],
}
