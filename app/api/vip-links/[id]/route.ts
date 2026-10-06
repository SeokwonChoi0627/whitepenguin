import { NextRequest, NextResponse } from 'next/server'
import { validateVipLinkInput } from '@/lib/vip'
import { KNOWN_PRODUCT_IDS, parseVipLinkInput, requireAdmin, toVipLinkInput } from '@/lib/vip-input'
import { deleteVipLink, generateVipToken, getVipLinkById, updateVipLink } from '@/lib/vip-store'

/**
 * 관리자: VIP 링크 수정.
 * 본문에 regenerate_token: true 가 있으면 링크 주소를 새로 발급한다 (기존 주소는 즉시 무효).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  try {
    const existing = await getVipLinkById(params.id)
    if (!existing) return NextResponse.json({ error: '링크를 찾을 수 없습니다.' }, { status: 404 })

    const body = await req.json().catch(() => null)
    const merged = parseVipLinkInput(body, toVipLinkInput(existing))
    if (!merged) return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })

    const validation = validateVipLinkInput(merged, KNOWN_PRODUCT_IDS)
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

    const regenerate = (body as Record<string, unknown>).regenerate_token === true
    return NextResponse.json(
      await updateVipLink(params.id, regenerate ? { ...merged, token: generateVipToken() } : merged)
    )
  } catch (err) {
    console.error('VIP 링크 수정 오류:', err)
    return NextResponse.json({ error: 'VIP 링크 수정에 실패했습니다.' }, { status: 500 })
  }
}

/** 관리자: VIP 링크 삭제 (지난 발주 기록은 quotes 에 남는다) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  try {
    await deleteVipLink(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('VIP 링크 삭제 오류:', err)
    return NextResponse.json({ error: 'VIP 링크 삭제에 실패했습니다.' }, { status: 500 })
  }
}
