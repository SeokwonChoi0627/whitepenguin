// 쿠폰 도메인 — 클라이언트/서버가 공유하는 타입과 검증 규칙.
// 서버는 이 검증을 반드시 다시 실행한다 (클라이언트 값은 신뢰하지 않는다).

export type DiscountType = 'fixed' | 'percent'

export interface Coupon {
  id: string
  /** 프로모션 코드. null 이면 코드 없이 전 회원 대상 */
  code: string | null
  name: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  min_order_amount: number
  /** percent 쿠폰의 할인 상한 (null = 무제한) */
  max_discount_amount: number | null
  starts_at: string | null
  expires_at: string | null
  /** 전체 발행 한도 (null = 무제한) */
  max_redemptions: number | null
  /** 코드 없이 전 회원이 쓸 수 있는 쿠폰인지 */
  auto_apply_to_members: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

/** 마이페이지·발주서에 내려보내는 쿠폰 (사용 가능 여부 포함) */
export interface AvailableCoupon extends Coupon {
  /** 이미 사용한 쿠폰인지 */
  used: boolean
}

export interface CouponRedemption {
  id: string
  coupon_id: string
  user_id: string
  order_number: string
  discount_amount: number
  redeemed_at: string
}

export const MAX_CODE_LENGTH = 32
export const MAX_NAME_LENGTH = 100
export const MAX_DESCRIPTION_LENGTH = 300

export interface CouponCheck {
  ok: boolean
  error?: string
}

/** 코드 입력값 정규화 — 대문자·공백 제거로 'autumn10' 과 'AUTUMN10' 을 같게 본다 */
export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function describeDiscount(coupon: Pick<Coupon, 'discount_type' | 'discount_value' | 'max_discount_amount'>): string {
  if (coupon.discount_type === 'percent') {
    const cap = coupon.max_discount_amount
      ? ` (최대 ${coupon.max_discount_amount.toLocaleString()}원)`
      : ''
    return `${coupon.discount_value}% 할인${cap}`
  }
  return `${coupon.discount_value.toLocaleString()}원 할인`
}

export function formatCouponPeriod(coupon: Pick<Coupon, 'expires_at'>): string {
  if (!coupon.expires_at) return '기간 제한 없음'
  const d = new Date(coupon.expires_at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}까지`
}

/**
 * 쿠폰 자체가 지금 쓸 수 있는 상태인지 검사한다 (주문 금액과 무관한 조건).
 *
 * @param now 테스트에서 시각을 고정하기 위해 주입 가능
 */
export function checkCouponUsable(coupon: Coupon, now: Date = new Date()): CouponCheck {
  if (!coupon.is_active) {
    return { ok: false, error: '사용할 수 없는 쿠폰입니다.' }
  }
  if (coupon.starts_at && now < new Date(coupon.starts_at)) {
    return { ok: false, error: '아직 사용 기간이 시작되지 않은 쿠폰입니다.' }
  }
  if (coupon.expires_at && now > new Date(coupon.expires_at)) {
    return { ok: false, error: '사용 기간이 지난 쿠폰입니다.' }
  }
  return { ok: true }
}

/**
 * 주문 금액까지 포함해 쿠폰을 쓸 수 있는지 검사한다.
 *
 * @param orderAmount 수량 할인까지 적용된 금액 — 최소 주문금액 판단 기준
 * @param alreadyUsed 이 사용자가 이미 쓴 쿠폰인지
 */
export function validateCouponForOrder(
  coupon: Coupon,
  orderAmount: number,
  alreadyUsed: boolean,
  now: Date = new Date()
): CouponCheck {
  const usable = checkCouponUsable(coupon, now)
  if (!usable.ok) return usable

  if (alreadyUsed) {
    return { ok: false, error: '이미 사용한 쿠폰입니다.' }
  }
  if (orderAmount < coupon.min_order_amount) {
    const short = coupon.min_order_amount - orderAmount
    return {
      ok: false,
      error:
        `${coupon.min_order_amount.toLocaleString()}원 이상 주문 시 사용할 수 있습니다. ` +
        `(${short.toLocaleString()}원 부족)`,
    }
  }
  return { ok: true }
}

export interface CouponInput {
  code: string | null
  name: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  min_order_amount: number
  max_discount_amount: number | null
  starts_at: string | null
  expires_at: string | null
  max_redemptions: number | null
  auto_apply_to_members: boolean
  is_active: boolean
}

/** 관리자가 쿠폰을 만들거나 고칠 때의 입력 검증 */
export function validateCouponInput(input: CouponInput): CouponCheck {
  if (!input.name?.trim()) return { ok: false, error: '쿠폰 이름을 입력해 주세요.' }
  if (input.name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `쿠폰 이름은 ${MAX_NAME_LENGTH}자 이내여야 합니다.` }
  }
  if ((input.description?.length ?? 0) > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, error: `설명은 ${MAX_DESCRIPTION_LENGTH}자 이내여야 합니다.` }
  }

  if (input.code !== null) {
    if (!/^[A-Z0-9_-]{3,32}$/.test(input.code)) {
      return { ok: false, error: '코드는 영문 대문자·숫자·-·_ 조합 3~32자여야 합니다.' }
    }
  } else if (!input.auto_apply_to_members) {
    return { ok: false, error: '코드가 없는 쿠폰은 전 회원 대상으로 설정해야 합니다.' }
  }

  if (input.discount_type !== 'fixed' && input.discount_type !== 'percent') {
    return { ok: false, error: '할인 방식이 올바르지 않습니다.' }
  }
  if (!Number.isInteger(input.discount_value) || input.discount_value <= 0) {
    return { ok: false, error: '할인 값은 1 이상의 정수여야 합니다.' }
  }
  if (input.discount_type === 'percent' && input.discount_value > 100) {
    return { ok: false, error: '할인율은 100%를 넘을 수 없습니다.' }
  }
  if (input.discount_type === 'fixed' && input.max_discount_amount !== null) {
    return { ok: false, error: '정액 쿠폰에는 할인 상한을 설정할 수 없습니다.' }
  }

  if (!Number.isInteger(input.min_order_amount) || input.min_order_amount < 0) {
    return { ok: false, error: '최소 주문금액이 올바르지 않습니다.' }
  }
  if (input.max_discount_amount !== null &&
      (!Number.isInteger(input.max_discount_amount) || input.max_discount_amount <= 0)) {
    return { ok: false, error: '할인 상한이 올바르지 않습니다.' }
  }
  if (input.max_redemptions !== null &&
      (!Number.isInteger(input.max_redemptions) || input.max_redemptions <= 0)) {
    return { ok: false, error: '발행 한도가 올바르지 않습니다.' }
  }

  if (input.starts_at && input.expires_at &&
      new Date(input.starts_at) > new Date(input.expires_at)) {
    return { ok: false, error: '시작일이 종료일보다 늦을 수 없습니다.' }
  }

  return { ok: true }
}
