'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Search,
} from 'lucide-react'

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: { roadAddress: string; jibunAddress: string }) => void
      }) => { open: () => void }
    }
  }
}

interface Props {
  initial: {
    email: string
    name: string
    companyName: string
    phone: string
    businessNumber: string
    address: string
    addressDetail: string
    hasPassword: boolean
  }
}

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

export default function SettingsClient({ initial }: Props) {
  const router = useRouter()
  const addressDetailRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState({
    name: initial.name,
    companyName: initial.companyName,
    phone: initial.phone,
    businessNumber: initial.businessNumber,
    address: initial.address,
    addressDetail: initial.addressDetail,
  })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [profileStatus, setProfileStatus] = useState<Status>({ kind: 'idle' })
  const [pwStatus, setPwStatus] = useState<Status>({ kind: 'idle' })

  const profileDirty =
    profile.name !== initial.name ||
    profile.companyName !== initial.companyName ||
    profile.phone !== initial.phone ||
    profile.businessNumber !== initial.businessNumber ||
    profile.address !== initial.address ||
    profile.addressDetail !== initial.addressDetail

  const openAddressSearch = () => {
    const doOpen = () => {
      new window.daum.Postcode({
        oncomplete: (data) => {
          setProfile((p) => ({ ...p, address: data.roadAddress || data.jibunAddress }))
          setTimeout(() => addressDetailRef.current?.focus(), 100)
        },
      }).open()
    }
    if (window.daum?.Postcode) {
      doOpen()
    } else {
      const script = document.createElement('script')
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
      script.onload = doOpen
      document.head.appendChild(script)
    }
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.name.trim()) {
      setProfileStatus({ kind: 'error', message: '이름을 입력해주세요.' })
      return
    }
    setProfileStatus({ kind: 'saving' })
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '저장에 실패했습니다.')
      setProfileStatus({ kind: 'success', message: '프로필이 저장되었습니다.' })
      router.refresh()
    } catch (err) {
      setProfileStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : '저장에 실패했습니다.',
      })
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.newPassword.length < 8) {
      setPwStatus({ kind: 'error', message: '새 비밀번호는 8자 이상이어야 합니다.' })
      return
    }
    if (pw.newPassword !== pw.confirm) {
      setPwStatus({ kind: 'error', message: '새 비밀번호가 일치하지 않습니다.' })
      return
    }
    setPwStatus({ kind: 'saving' })
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pw.currentPassword,
          newPassword: pw.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '변경에 실패했습니다.')
      setPwStatus({ kind: 'success', message: '비밀번호가 변경되었습니다.' })
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      setPwStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : '변경에 실패했습니다.',
      })
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        href="/mypage"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#333333] transition-colors"
      >
        <ChevronLeft size={16} />
        마이페이지
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-[#333333]">계정 설정</h1>
        <p className="text-sm text-gray-500 mt-1">
          여기에 저장된 정보는 발주서 작성 시 자동으로 불러옵니다.
        </p>
      </header>

      {/* 프로필 편집 */}
      <form
        onSubmit={saveProfile}
        className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <User size={18} className="text-[#C4A882]" />
          <h2 className="font-bold text-gray-900">기본 정보</h2>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">이메일</label>
            <input
              type="email"
              value={initial.email}
              disabled
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              이메일은 로그인 식별자이므로 변경할 수 없습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                담당자명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                maxLength={50}
                placeholder="홍길동"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A882]/40 focus:border-[#C4A882]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">전화번호</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                maxLength={20}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A882]/40 focus:border-[#C4A882]"
                placeholder="010-0000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">회사명</label>
              <input
                type="text"
                value={profile.companyName}
                onChange={(e) => setProfile((p) => ({ ...p, companyName: e.target.value }))}
                maxLength={100}
                placeholder="(주)베이커리나라"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A882]/40 focus:border-[#C4A882]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                사업자등록번호
              </label>
              <input
                type="text"
                value={profile.businessNumber}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, businessNumber: e.target.value }))
                }
                maxLength={30}
                placeholder="000-00-00000"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A882]/40 focus:border-[#C4A882]"
              />
            </div>
          </div>

          {/* 배송지 주소 */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
              <MapPin size={13} className="text-[#C4A882]" />
              기본 배송지
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                readOnly
                value={profile.address}
                onClick={openAddressSearch}
                placeholder="주소 검색 버튼을 눌러주세요"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C4A882]/40 focus:border-[#C4A882]"
              />
              <button
                type="button"
                onClick={openAddressSearch}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-[#333333] text-white text-xs font-semibold rounded-xl hover:bg-[#1a1a1a] transition-colors whitespace-nowrap"
              >
                <Search size={13} />
                주소 검색
              </button>
            </div>
            <input
              ref={addressDetailRef}
              type="text"
              value={profile.addressDetail}
              onChange={(e) => setProfile((p) => ({ ...p, addressDetail: e.target.value }))}
              maxLength={100}
              placeholder="상세 주소 (동/호수, 건물명 등)"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A882]/40 focus:border-[#C4A882]"
            />
          </div>

          {profileStatus.kind === 'success' && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 size={16} /> {profileStatus.message}
            </div>
          )}
          {profileStatus.kind === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle size={16} /> {profileStatus.message}
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            발주서를 제출하면 입력값이 이 프로필에 자동 저장됩니다.
          </p>
          <button
            type="submit"
            disabled={!profileDirty || profileStatus.kind === 'saving'}
            className="px-5 py-2.5 rounded-xl bg-[#333333] text-white text-sm font-semibold hover:bg-[#1a1a1a] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {profileStatus.kind === 'saving' ? '저장 중...' : '프로필 저장'}
          </button>
        </div>
      </form>

      {/* 비밀번호 변경 */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Lock size={18} className="text-[#C4A882]" />
          <h2 className="font-bold text-gray-900">비밀번호</h2>
        </div>

        {initial.hasPassword ? (
          <form onSubmit={changePassword}>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={pw.currentPassword}
                  onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A882]/40 focus:border-[#C4A882]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  새 비밀번호 (8자 이상)
                </label>
                <input
                  type="password"
                  value={pw.newPassword}
                  onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A882]/40 focus:border-[#C4A882]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A882]/40 focus:border-[#C4A882]"
                />
              </div>

              {pwStatus.kind === 'success' && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 size={16} /> {pwStatus.message}
                </div>
              )}
              {pwStatus.kind === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle size={16} /> {pwStatus.message}
                </div>
              )}
            </div>

            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={
                  pwStatus.kind === 'saving' ||
                  !pw.currentPassword ||
                  !pw.newPassword ||
                  !pw.confirm
                }
                className="px-5 py-2.5 rounded-xl bg-[#333333] text-white text-sm font-semibold hover:bg-[#1a1a1a] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {pwStatus.kind === 'saving' ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">
              소셜 로그인(카카오/네이버) 계정은 비밀번호가 없습니다.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              각 소셜 계정 관리 페이지에서 비밀번호를 변경해주세요.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
