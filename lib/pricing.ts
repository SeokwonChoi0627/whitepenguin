// 발주 금액 계산 — 클라이언트와 서버가 공유하는 단일 출처.
//
// 이전에는 app/quote/page.tsx 와 app/api/send-quote/route.ts 에 같은 계산이
// 복붙돼 있었다. 한쪽만 고치면 화면 금액과 청구 금액이 어긋나므로 여기로 합쳤다.

import type { Coupon } from '@/lib/coupons'

/**
 * 금액 계산에 필요한 최소 형태.
 * lib/types 의 CartItem 도 구조적으로 이 조건을 만족하므로,
 * 발주 API 처럼 상품 필드를 일부만 넘기는 곳에서도 그대로 쓸 수 있다.
 */
export interface PricedItem {
  product: { priceVatIncluded: number }
  quantity: number
}

/** 수량 할인 구간 — 많이 담을수록 높은 할인율 */
export const QUANTITY_DISCOUNT_TIERS = [
  { minQuantity: 100, rate: 0.15 },
  { minQuantity: 50, rate: 0.12 },
  { minQuantity: 10, rate: 0.1 },
] as const

/** 이 금액 이상일 때만 천원 미만을 절사한다 */
export const ROUNDING_THRESHOLD = 100000

export interface OrderTotals {
  totalQuantity: number
  /** 상품 금액 합계 (VAT 포함, 할인 전) */
  subtotal: number
  quantityDiscountRate: number
  quantityDiscountAmount: number
  /** 수량 할인까지 적용한 금액 — percent 쿠폰의 기준 금액 */
  afterQuantityDiscount: number
  couponDiscountAmount: number
  /** 천원 미만 절사로 깎인 금액 */
  roundingAmount: number
  /** 고객이 실제로 입금할 금액 */
  finalTotal: number
}

export function getQuantityDiscountRate(totalQuantity: number): number {
  return QUANTITY_DISCOUNT_TIERS.find((tier) => totalQuantity >= tier.minQuantity)?.rate ?? 0
}

/**
 * 쿠폰 할인 금액을 계산한다. 유효성 검사는 하지 않는다 —
 * 호출 전에 lib/coupons.ts 의 validateCouponForOrder 를 통과시킬 것.
 *
 * @param baseAmount 수량 할인까지 적용된 금액
 */
export function calculateCouponDiscount(coupon: Coupon | null, baseAmount: number): number {
  if (!coupon) return 0

  const raw =
    coupon.discount_type === 'percent'
      ? Math.round((baseAmount * coupon.discount_value) / 100)
      : coupon.discount_value

  const capped =
    coupon.discount_type === 'percent' && coupon.max_discount_amount
      ? Math.min(raw, coupon.max_discount_amount)
      : raw

  // 할인이 결제 금액을 넘지 않도록 한다
  return Math.max(0, Math.min(capped, baseAmount))
}

/**
 * 발주 금액을 계산한다.
 *
 * 순서: 상품 합계 → 수량 할인 → 쿠폰 할인 → 천원 미만 절사
 * 절사는 기존 규칙대로 10만원 이상일 때만 적용한다.
 */
export function calculateOrderTotals(cart: PricedItem[], coupon: Coupon | null = null): OrderTotals {
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.priceVatIncluded * item.quantity,
    0
  )

  const quantityDiscountRate = getQuantityDiscountRate(totalQuantity)
  const quantityDiscountAmount = Math.round(subtotal * quantityDiscountRate)
  const afterQuantityDiscount = subtotal - quantityDiscountAmount

  const couponDiscountAmount = calculateCouponDiscount(coupon, afterQuantityDiscount)
  const afterCoupon = afterQuantityDiscount - couponDiscountAmount

  const rounded =
    afterCoupon >= ROUNDING_THRESHOLD ? Math.floor(afterCoupon / 1000) * 1000 : afterCoupon

  return {
    totalQuantity,
    subtotal,
    quantityDiscountRate,
    quantityDiscountAmount,
    afterQuantityDiscount,
    couponDiscountAmount,
    roundingAmount: afterCoupon - rounded,
    finalTotal: rounded,
  }
}
