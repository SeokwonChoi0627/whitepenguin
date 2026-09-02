import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { resolveCouponForCart, resolveCouponRecordById } from '@/lib/coupon-resolver'
import { getCouponById } from '@/lib/coupon-store'
import { describeDiscount } from '@/lib/coupons'
import type { PricedItem } from '@/lib/pricing'

/** 장바구니 항목에서 금액 계산에 필요한 값만 추린다 (클라이언트 값 신뢰 최소화) */
function parseCart(raw: unknown): PricedItem[] | null {
  if (!Array.isArray(raw)) return null
  const cart: PricedItem[] = []
  for (const line of raw) {
    if (typeof line !== 'object' || line === null) continue
    const l = line as Record<string, unknown>
    const p = l.product as Record<string, unknown> | undefined
    const quantity = Number(l.quantity)
    const price = Number(p?.priceVatIncluded)
    if (!p || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price)) continue
    cart.push({ product: { priceVatIncluded: price }, quantity })
  }
  return cart
}

/**
 * 발주서 화면에서 쿠폰을 적용해 보는 미리보기.
 * 실제 제출(send-quote)과 같은 resolver 를 쓰므로 여기서 본 금액이 곧 청구 금액이다.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: '쿠폰은 로그인 후 사용할 수 있습니다.' }, { status: 401 })
  }
  const user = session.user as { id?: string }
  if (!user.id) {
    return NextResponse.json({ error: '계정 정보를 확인할 수 없습니다.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }
  const { cart: rawCart, code, couponId } = body as {
    cart?: unknown; code?: unknown; couponId?: unknown
  }

  const cart = parseCart(rawCart)
  if (!cart || cart.length === 0) {
    return NextResponse.json({ error: '장바구니가 비어 있습니다.' }, { status: 400 })
  }

  try {
    // couponId 는 마이페이지에서 고른 회원 대상 쿠폰, code 는 직접 입력한 프로모션 코드
    const resolved = typeof couponId === 'string' && couponId
      ? await (async () => {
          const coupon = await getCouponById(couponId)
          if (!coupon) {
            return { ok: false as const, error: '쿠폰을 찾을 수 없습니다.', coupon: null, totals: null }
          }
          if (!coupon.auto_apply_to_members) {
            return { ok: false as const, error: '코드를 입력해야 사용할 수 있는 쿠폰입니다.', coupon: null, totals: null }
          }
          return await resolveCouponRecordById(cart, coupon, user.id!)
        })()
      : await resolveCouponForCart(cart, typeof code === 'string' ? code : null, user.id)

    if (!resolved.ok || !resolved.coupon || !resolved.totals) {
      return NextResponse.json({ ok: false, error: resolved.error ?? '사용할 수 없는 쿠폰입니다.' }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      coupon: {
        id: resolved.coupon.id,
        code: resolved.coupon.code,
        name: resolved.coupon.name,
        summary: describeDiscount(resolved.coupon),
      },
      totals: resolved.totals,
    })
  } catch (err) {
    console.error('쿠폰 검증 오류:', err)
    return NextResponse.json({ error: '쿠폰을 확인하지 못했습니다.' }, { status: 500 })
  }
}
