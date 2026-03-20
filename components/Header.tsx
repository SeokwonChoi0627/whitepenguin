'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, ShoppingCart, User, LogOut } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'

const NAV = [
  { href: '/products', label: '상품' },
  { href: '/quote', label: '발주서' },
  { href: '/community', label: '커뮤니티' },
  { href: '/reviews', label: '리뷰' },
  { href: '/qna', label: 'Q&A' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* 로고 */}
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="White Penguin" className="h-14 w-auto object-contain" />
          </Link>

          {/* 데스크탑 메뉴 */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className="text-gray-600 hover:text-[#333333] font-medium transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>

          {/* 우측 버튼 */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/quote"
              className="flex items-center gap-1.5 text-gray-600 hover:text-[#333333] transition-colors">
              <ShoppingCart size={20} />
              <span className="text-sm font-medium">발주서</span>
            </Link>
            {session ? (
              <div className="flex items-center gap-2">
                <Link href="/mypage"
                  className="flex items-center gap-1.5 text-gray-600 hover:text-[#333333] transition-colors text-sm font-medium">
                  <User size={16} />
                  {(session.user as any)?.companyName || session.user?.name || '마이페이지'}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-1.5 border border-gray-200 text-gray-500 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  <LogOut size={14} />
                  로그아웃
                </button>
              </div>
            ) : (
              <Link href="/auth"
                className="flex items-center gap-1.5 bg-[#333333] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1a1a1a] transition-colors">
                <User size={16} />
                로그인
              </Link>
            )}
          </div>

          {/* 모바일 햄버거 */}
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="block text-gray-700 font-medium py-2" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 flex gap-3">
            <Link href="/quote"
              className="flex-1 text-center border border-[#C4A882] text-[#C4A882] py-2 rounded-lg text-sm font-medium"
              onClick={() => setOpen(false)}>
              발주서
            </Link>
            {session ? (
              <div className="flex-1 flex gap-2">
                <Link href="/mypage"
                  className="flex-1 text-center bg-[#333333] text-white py-2 rounded-lg text-sm font-medium"
                  onClick={() => setOpen(false)}>
                  마이페이지
                </Link>
                <button
                  onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }) }}
                  className="flex-1 text-center border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium">
                  로그아웃
                </button>
              </div>
            ) : (
              <Link href="/auth"
                className="flex-1 text-center bg-[#333333] text-white py-2 rounded-lg text-sm font-medium"
                onClick={() => setOpen(false)}>
                로그인
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
