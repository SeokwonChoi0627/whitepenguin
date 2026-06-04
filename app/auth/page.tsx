'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 로그인 폼
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  // 회원가입 폼
  const [registerForm, setRegisterForm] = useState({
    email: '', password: '', passwordConfirm: '',
    name: '', companyName: '', phone: '',
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email: loginForm.email,
      password: loginForm.password,
      redirect: false,
    })

    if (res?.error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } else {
      router.push('/mypage')
    }
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (registerForm.password !== registerForm.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }
    if (registerForm.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registerForm.email,
        password: registerForm.password,
        name: registerForm.name,
        companyName: registerForm.companyName,
        phone: registerForm.phone,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || '회원가입에 실패했습니다.')
      setLoading(false)
      return
    }

    // 회원가입 성공 후 자동 로그인
    await signIn('credentials', {
      email: registerForm.email,
      password: registerForm.password,
      redirect: false,
    })
    router.push('/mypage')
    setLoading(false)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-auth.png" alt="화이트펭귄" className="h-36 w-auto mx-auto mb-3" />
          <p className="text-gray-500 text-sm mt-1">B2B, B2C 베이킹도구 전문플랫폼</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          {/* 탭 */}
          <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}>
              로그인
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                mode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}>
              회원가입
            </button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 로그인 폼 */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="email"
                placeholder="이메일 주소"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
              />
              <input
                type="password"
                placeholder="비밀번호"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#333333] text-white font-semibold py-3 rounded-xl hover:bg-[#1a1a1a] transition-colors disabled:opacity-50">
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          )}

          {/* 회원가입 폼 */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <input
                type="text"
                placeholder="이름 *"
                required
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
              />
              <input
                type="text"
                placeholder="업체명 (선택)"
                value={registerForm.companyName}
                onChange={(e) => setRegisterForm({ ...registerForm, companyName: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
              />
              <input
                type="tel"
                placeholder="연락처 (선택)"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
              />
              <input
                type="email"
                placeholder="이메일 주소 *"
                required
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
              />
              <input
                type="password"
                placeholder="비밀번호 (6자 이상) *"
                required
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
              />
              <input
                type="password"
                placeholder="비밀번호 확인 *"
                required
                value={registerForm.passwordConfirm}
                onChange={(e) => setRegisterForm({ ...registerForm, passwordConfirm: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#333333] text-white font-semibold py-3 rounded-xl hover:bg-[#1a1a1a] transition-colors disabled:opacity-50">
                {loading ? '처리 중...' : '회원가입'}
              </button>
            </form>
          )}

          {/* 비회원 주문 구분선 */}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* 비회원으로 주문하기 */}
          <Link
            href="/quote"
            className="mt-3 w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            비회원으로 주문하기
          </Link>

          {/* 소셜 로그인 구분선 */}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">소셜 로그인</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* 네이버 로그인 버튼 */}
          <button
            type="button"
            onClick={() => signIn('naver', { callbackUrl: '/mypage' })}
            className="mt-3 w-full flex items-center justify-center gap-2.5 bg-[#03C75A] text-white font-semibold py-3 rounded-xl hover:bg-[#02b350] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
            </svg>
            네이버로 {mode === 'login' ? '로그인' : '시작하기'}
          </button>

          {/* 카카오 로그인 버튼 */}
          <button
            type="button"
            onClick={() => signIn('kakao', { callbackUrl: '/mypage' })}
            className="mt-2.5 w-full flex items-center justify-center gap-2.5 bg-[#FEE500] text-[#191919] font-semibold py-3 rounded-xl hover:bg-[#f0d800] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.612 5.074 4.07 6.518L5.1 21l4.388-2.308A11.6 11.6 0 0 0 12 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
            </svg>
            카카오로 {mode === 'login' ? '로그인' : '시작하기'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          로그인 시{' '}
          <Link href="#" className="underline">이용약관</Link>
          {' '}및{' '}
          <Link href="#" className="underline">개인정보처리방침</Link>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  )
}
