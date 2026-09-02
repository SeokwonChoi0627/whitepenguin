import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { isAdminEmail } from '@/lib/admin'
import { getPopupSettings, savePopupSettings } from '@/lib/popup-store'
import {
  isPopupVisible,
  validatePopupSettings,
  type PopupSettings,
  type PublicPopup,
} from '@/lib/popup'

// 메인은 정적 생성이라 서버에서 설정을 읽으면 재배포 전까지 반영되지 않는다.
// 그래서 팝업만 이 라우트로 분리해 클라이언트가 매번 최신 설정을 받아간다.
export const dynamic = 'force-dynamic'

/**
 * 팝업 노출 정보 (공개).
 * 노출 조건을 만족할 때만 내용을 주고, 아니면 null 을 준다 —
 * 예정된 이벤트 정보가 미리 새어나가지 않도록.
 */
export async function GET() {
  try {
    const settings = await getPopupSettings()
    if (!isPopupVisible(settings)) {
      return NextResponse.json({ popup: null })
    }
    const popup: PublicPopup = {
      imageUrl: settings.image_url!,
      linkHref: settings.link_href,
      altText: settings.alt_text,
    }
    return NextResponse.json({ popup })
  } catch (err) {
    // 설정 조회 실패로 메인 페이지가 깨지면 안 된다 — 팝업만 조용히 생략한다
    console.error('팝업 설정 조회 오류:', err)
    return NextResponse.json({ popup: null })
  }
}

/** 관리자: 현재 설정 전체 조회 */
export async function POST() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { email?: string } | undefined
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }
  try {
    return NextResponse.json(await getPopupSettings())
  } catch (err) {
    console.error('팝업 설정 조회 오류:', err)
    return NextResponse.json({ error: '설정을 불러오지 못했습니다.' }, { status: 500 })
  }
}

/** 관리자: 설정 저장 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as { email?: string } | undefined
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }
  const b = body as Record<string, unknown>
  const emptyToNull = (v: unknown) =>
    typeof v === 'string' && v.trim() ? v.trim() : null

  try {
    const current = await getPopupSettings()
    const merged: Pick<
      PopupSettings,
      'is_enabled' | 'image_url' | 'link_href' | 'alt_text' | 'starts_on' | 'ends_on'
    > = {
      is_enabled: 'is_enabled' in b ? b.is_enabled === true : current.is_enabled,
      image_url: 'image_url' in b ? emptyToNull(b.image_url) : current.image_url,
      link_href: 'link_href' in b ? String(b.link_href ?? '').trim() : current.link_href,
      alt_text: 'alt_text' in b ? String(b.alt_text ?? '').trim() : current.alt_text,
      starts_on: 'starts_on' in b ? emptyToNull(b.starts_on) : current.starts_on,
      ends_on: 'ends_on' in b ? emptyToNull(b.ends_on) : current.ends_on,
    }

    const validation = validatePopupSettings(merged)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    return NextResponse.json(await savePopupSettings(merged))
  } catch (err) {
    console.error('팝업 설정 저장 오류:', err)
    return NextResponse.json({ error: '설정 저장에 실패했습니다.' }, { status: 500 })
  }
}
