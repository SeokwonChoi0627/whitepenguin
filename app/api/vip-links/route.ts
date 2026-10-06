import { NextRequest, NextResponse } from 'next/server'
import { validateVipLinkInput } from '@/lib/vip'
import { KNOWN_PRODUCT_IDS, parseVipLinkInput, requireAdmin } from '@/lib/vip-input'
import { createVipLink, listVipLinks } from '@/lib/vip-store'

/** 관리자: VIP 링크 목록 */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  try {
    return NextResponse.json(await listVipLinks())
  } catch (err) {
    console.error('VIP 링크 조회 오류:', err)
    return NextResponse.json({ error: 'VIP 링크를 불러오지 못했습니다.' }, { status: 500 })
  }
}

/** 관리자: VIP 링크 발급 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const input = parseVipLinkInput(await req.json().catch(() => null))
  if (!input) return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })

  const validation = validateVipLinkInput(input, KNOWN_PRODUCT_IDS)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

  try {
    return NextResponse.json(await createVipLink(input))
  } catch (err) {
    console.error('VIP 링크 생성 오류:', err)
    return NextResponse.json({ error: 'VIP 링크 생성에 실패했습니다.' }, { status: 500 })
  }
}
