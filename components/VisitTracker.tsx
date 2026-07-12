'use client'

import { useEffect } from 'react'

// 마운트 시 방문 집계 엔드포인트를 한 번 호출한다. 실패는 무시(UX 영향 없음).
export default function VisitTracker() {
  useEffect(() => {
    fetch('/api/visit', { method: 'POST' }).catch(() => {})
  }, [])
  return null
}
