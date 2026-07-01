'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

// 배너 이미지 & 링크 설정
const BANNER_SRC = '/popup-banner.jpg'
const CTA_HREF = '/products' // '자세히 보기' → 전체 상품 목록
const DISMISS_KEY = 'wp_popup_dismissed_date' // '오늘 하루 보지 않기' 저장 키

/** 로컬 기준 오늘 날짜 (YYYY-MM-DD) */
function today(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export default function PopupBanner() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // '오늘 하루 보지 않기'로 오늘 날짜가 저장돼 있으면 표시하지 않음
    try {
      if (localStorage.getItem(DISMISS_KEY) !== today()) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [])

  // 팝업이 열려 있는 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const close = () => setOpen(false)

  const dismissForToday = () => {
    try {
      localStorage.setItem(DISMISS_KEY, today())
    } catch {
      /* localStorage 사용 불가 시 무시 */
    }
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="이벤트 안내 팝업"
      onClick={close} // 배경 클릭 시 닫기
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()} // 카드 내부 클릭은 닫히지 않도록
      >
        {/* 닫기 X */}
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
        >
          <X size={18} />
        </button>

        {/* 배너 이미지 전체가 '자세히 보기' 링크 */}
        <Link href={CTA_HREF} onClick={close} className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BANNER_SRC}
            alt="오픈기념 무료배송 이벤트 - 자세히 보기"
            className="block w-full cursor-pointer"
          />
        </Link>

        {/* 하단 컨트롤 바 */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={dismissForToday}
            className="text-sm text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
          >
            오늘 하루 보지 않기
          </button>
          <Link
            href={CTA_HREF}
            onClick={close}
            className="rounded-lg bg-[#333333] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a1a1a]"
          >
            자세히 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
