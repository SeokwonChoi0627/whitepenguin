import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import NaverProvider from 'next-auth/providers/naver'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export const authOptions: NextAuthOptions = {
  providers: [
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
    // 카카오 커스텀 프로바이더 (Client Secret 미설정 앱용)
    {
      id: 'kakao',
      name: 'Kakao',
      type: 'oauth',
      authorization: {
        url: 'https://kauth.kakao.com/oauth/authorize',
        params: { scope: 'profile_nickname account_email' },
      },
      token: {
        url: 'https://kauth.kakao.com/oauth/token',
        async request(context: any) {
          const { provider, params } = context
          const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: provider.clientId,
            redirect_uri: provider.callbackUrl,
            code: params.code,
          })
          const res = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          })
          const tokens = await res.json()
          return { tokens }
        },
      },
      userinfo: {
        url: 'https://kapi.kakao.com/v2/user/me',
      },
      profile(profile: any) {
        return {
          id: String(profile.id),
          name: profile.kakao_account?.profile?.nickname ?? '',
          email: profile.kakao_account?.email ?? '',
          image: profile.kakao_account?.profile?.profile_image_url ?? null,
        }
      },
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: '',
    } as any,
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
      // 소셜 로그인 시 Supabase users 테이블에 자동 upsert
      if (account?.provider === 'naver' || account?.provider === 'kakao') {
        const email = user.email
        if (!email) return false

        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single()

        if (!existing) {
          await supabase.from('users').insert({
            email,
            name: user.name ?? '',
            company_name: null,
            phone: null,
            password_hash: null,
          })
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.companyName = (user as any).companyName
        token.phone = (user as any).phone
      }
      // 소셜 로그인 후 DB에서 추가 정보 불러오기
      if ((account?.provider === 'naver' || account?.provider === 'kakao') && token.email) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, company_name, phone')
          .eq('email', token.email)
          .single()
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
