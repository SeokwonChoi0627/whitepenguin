'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { todayString, type PublicPopup } from '@/lib/popup'

const DISMISS_KEY = 'wp_popup_dismissed_date' // '오늘 하루 보지 않기' 저장 키

/**
 * 메인 팝업 배너.
 *
 * 설정을 서버 컴포넌트에서 읽지 않고 여기서 가져온다. 메인 페이지는 정적 생성이라
 * 서버에서 읽으면 재배포 전까지 바뀐 설정이 반영되지 않는다.
 * (/api/popup 은 force-dynamic 이라 항상 최신 값을 준다)
 */
export default function PopupBanner() {
  const [popup, setPopup] = useState<PublicPopup | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // '오늘 하루 보지 않기'가 오늘 날짜로 저장돼 있으면 요청조차 하지 않는다
    try {
      if (localStorage.getItem(DISMISS_KEY) === todayString()) return
    } catch {
      /* localStorage 사용 불가 시 그대로 진행 */
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/popup', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !data.popup) return
        setPopup(data.popup as PublicPopup)
        setOpen(true)
      } catch {
        // 팝업은 부가 요소다 — 실패하면 조용히 표시하지 않는다
      }
    })()
    return () => {
      cancelled = true
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

  if (!open || !popup) return null

  const close = () => setOpen(false)

  const dismissForToday = () => {
    try {
      localStorage.setItem(DISMISS_KEY, todayString())
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

        {/* 배너 이미지 전체가 링크 */}
        <Link href={popup.linkHref} onClick={close} className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={popup.imageUrl}
            alt={popup.altText}
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
            href={popup.linkHref}
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
