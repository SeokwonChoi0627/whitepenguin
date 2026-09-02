import 'server-only'

// 쿠폰 적용 판정 — 미리보기(validate)와 실제 제출(send-quote)이 같은 경로를 쓴다.
// 두 곳이 따로 판단하면 화면에 보인 할인과 실제 청구액이 어긋난다.

import { getCouponByCode, hasUserRedeemed, countRedemptions } from '@/lib/coupon-store'
import { calculateOrderTotals, type OrderTotals, type PricedItem } from '@/lib/pricing'
import { validateCouponForOrder, type Coupon } from '@/lib/coupons'

export interface ResolvedCoupon {
  ok: boolean
  error?: string
  coupon: Coupon | null
  totals: OrderTotals
}

/**
 * 장바구니와 쿠폰 코드로 최종 금액을 확정한다.
 *
 * 클라이언트가 보낸 할인 금액은 절대 쓰지 않는다. 코드만 받아서
 * 존재 여부·유효기간·최소금액·중복사용·발행한도를 서버에서 다시 확인한다.
 *
 * 쿠폰이 유효하지 않으면 ok=false 와 함께 **쿠폰 없이 계산한 금액**을 돌려준다.
 * 호출자가 실패를 무시하더라도 할인 없는 정상 금액이 나오도록 하기 위함이다.
 */
export async function resolveCouponForCart(
  cart: PricedItem[],
  code: string | null | undefined,
  userId: string | null
): Promise<ResolvedCoupon> {
  const withoutCoupon = calculateOrderTotals(cart, null)

  if (!code?.trim()) {
    return { ok: true, coupon: null, totals: withoutCoupon }
  }
  if (!userId) {
    return {
      ok: false,
      error: '쿠폰은 로그인 후 사용할 수 있습니다.',
      coupon: null,
      totals: withoutCoupon,
    }
  }

  const coupon = await getCouponByCode(code)
  if (!coupon) {
    return { ok: false, error: '존재하지 않는 쿠폰 코드입니다.', coupon: null, totals: withoutCoupon }
  }

  return resolveCouponRecord(cart, coupon, userId, withoutCoupon)
}

/** 코드가 없는 회원 대상 쿠폰(쿠폰 id 로 선택)을 적용할 때 */
export async function resolveCouponRecordById(
  cart: PricedItem[],
  coupon: Coupon,
  userId: string
): Promise<ResolvedCoupon> {
  return resolveCouponRecord(cart, coupon, userId, calculateOrderTotals(cart, null))
}

async function resolveCouponRecord(
  cart: PricedItem[],
  coupon: Coupon,
  userId: string,
  withoutCoupon: OrderTotals
): Promise<ResolvedCoupon> {
  // 최소 주문금액은 수량 할인까지 적용된 금액을 기준으로 본다
  const baseAmount = withoutCoupon.afterQuantityDiscount

  const alreadyUsed = await hasUserRedeemed(coupon.id, userId)
  const check = validateCouponForOrder(coupon, baseAmount, alreadyUsed)
  if (!check.ok) {
    return { ok: false, error: check.error, coupon: null, totals: withoutCoupon }
  }

  if (coupon.max_redemptions !== null) {
    const used = await countRedemptions(coupon.id)
    if (used >= coupon.max_redemptions) {
      return { ok: false, error: '발행 수량이 모두 소진된 쿠폰입니다.', coupon: null, totals: withoutCoupon }
    }
  }

  return { ok: true, coupon, totals: calculateOrderTotals(cart, coupon) }
}
