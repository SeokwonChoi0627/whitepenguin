import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Vercel 서버는 UTC 이므로 KST(UTC+9) 로 변환해 "오늘" 날짜를 구한다.
function todayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10) // YYYY-MM-DD
}

export async function POST(req: NextRequest) {
  const today = todayKST()

  try {
    const seen = req.cookies.get('wp_seen')?.value
    if (seen === today) {
      // 오늘 이미 집계된 방문자 → dedup
      return new NextResponse(null, { status: 204 })
    }

    await supabase.rpc('increment_visit', { d: today })

    const res = new NextResponse(null, { status: 204 })
    res.cookies.set('wp_seen', today, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 2, // 2일 (당일 재방문 dedup 보장)
    })
    return res
  } catch {
    // 방문 집계는 best-effort. 실패해도 사용자에게 영향 없음.
    return new NextResponse(null, { status: 204 })
  }
}
