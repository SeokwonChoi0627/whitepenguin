import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: '화이트펭귄 | 베이킹 전문 B2B 도매 플랫폼',
  description: '반느통, 제과틀, 쿠키틀 등 전문 베이킹 용품 도매 공급. 카페·베이커리·제과 업체 전문 B2B 파트너.',
  verification: {
    google: 'JyjJhmZApY6fv93vD9JIcufvrAmXRSMBhJnqnDdFxnY',
  },
  other: {
    'naver-site-verification': '170d9f6636da957a5870a6c13cfec9492900fccf',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
