import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import NaverProvider from 'next-auth/providers/naver'
import KakaoProvider from 'next-auth/providers/kakao'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { linkSocialAccount } from '@/lib/social-account'

/** 소셜 로그인 provider 목록 — 판별을 한 곳에서만 한다 */
const SOCIAL_PROVIDERS = ['naver', 'kakao']

function isSocialProvider(provider?: string): boolean {
  return !!provider && SOCIAL_PROVIDERS.includes(provider)
}

export const authOptions: NextAuthOptions = {
  providers: [
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single()

        if (!user) return null

        // 소셜로만 가입한 계정은 비밀번호가 없다.
        // 이 검사가 없으면 bcrypt.compare 가 null 을 받아 예외를 던진다.
        if (!user.password_hash) return null

        const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash)
        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          companyName: user.company_name,
          phone: user.phone,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!isSocialProvider(account?.provider)) return true

      // 소셜 로그인은 인증만 해준다. 이 사이트의 회원 행이 없으면
      // 발주·쿠폰·반품이 전부 동작하지 않으므로, 연결에 실패하면 로그인을 막고
      // 왜 막혔는지 로그인 화면에서 알 수 있게 한다.
      const result = await linkSocialAccount({ email: user.email, name: user.name })
      if (result.ok) return true

      const detail = result.reason === 'create_failed' && result.code ? `&code=${result.code}` : ''
      return `/auth?error=${result.reason}${detail}`
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.companyName = (user as any).companyName
        token.phone = (user as any).phone
      }
      // 소셜 로그인 후 DB에서 회원 정보 불러오기 (token.id 가 있어야 발주·쿠폰이 동작한다)
      if (isSocialProvider(account?.provider) && token.email) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, company_name, phone')
          .eq('email', token.email)
          .maybeSingle()
        if (dbUser) {
          token.id = dbUser.id
          token.companyName = dbUser.company_name
          token.phone = dbUser.phone
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).companyName = token.companyName
        ;(session.user as any).phone = token.phone
      }
      return session
    },
  },
  pages: {
    signIn: '/auth',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
