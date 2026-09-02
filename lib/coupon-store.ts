import 'server-only'

// 쿠폰 서버 전용 데이터 접근 — service_role 로만 동작한다.
// 클라이언트 컴포넌트에서 import 하지 말 것 (server-only 가 빌드를 막는다).

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizeCouponCode, type AvailableCoupon, type Coupon } from '@/lib/coupons'

export const COUPON_TABLE = 'coupons'
export const REDEMPTION_TABLE = 'coupon_redemptions'

/** 유니크 제약 위반 — 같은 쿠폰을 두 번 쓰려 할 때 */
const UNIQUE_VIOLATION = '23505'

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(COUPON_TABLE)
    .select('*')
    .eq('code', normalizeCouponCode(code))
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as Coupon) ?? null
}

export async function getCouponById(id: string): Promise<Coupon | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(COUPON_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as Coupon) ?? null
}

/** 사용자가 이미 쓴 쿠폰 id 집합 */
export async function getUsedCouponIds(userId: string): Promise<Set<string>> {
  const { data, error } = await getSupabaseAdmin()
    .from(REDEMPTION_TABLE)
    .select('coupon_id')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((r) => (r as { coupon_id: string }).coupon_id))
}

/**
 * 사용자가 코드 없이 쓸 수 있는 쿠폰 목록 (마이페이지·발주서용).
 * 이미 쓴 쿠폰도 used=true 로 함께 내려 "사용 완료"를 보여줄 수 있게 한다.
 */
export async function listMemberCoupons(userId: string): Promise<AvailableCoupon[]> {
  const [{ data, error }, usedIds] = await Promise.all([
    getSupabaseAdmin()
      .from(COUPON_TABLE)
      .select('*')
      .eq('auto_apply_to_members', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    getUsedCouponIds(userId),
  ])

  if (error) throw new Error(error.message)
  return (data ?? []).map((c) => ({ ...(c as Coupon), used: usedIds.has((c as Coupon).id) }))
}

/** 전체 쿠폰 목록 (관리자) */
export async function listAllCoupons(): Promise<Coupon[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(COUPON_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)
  return (data ?? []) as Coupon[]
}

/** 쿠폰별 사용 건수 (관리자 현황) */
export async function countRedemptionsByCoupon(): Promise<Map<string, number>> {
  const { data, error } = await getSupabaseAdmin()
    .from(REDEMPTION_TABLE)
    .select('coupon_id')
    .limit(10000)

  if (error) throw new Error(error.message)
  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const id = (row as { coupon_id: string }).coupon_id
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

export async function countRedemptions(couponId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from(REDEMPTION_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', couponId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function hasUserRedeemed(couponId: string, userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from(REDEMPTION_TABLE)
    .select('id')
    .eq('coupon_id', couponId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data !== null
}

/**
 * 쿠폰 사용을 기록한다.
 *
 * 유니크 제약(coupon_id, user_id)에 걸리면 이미 쓴 쿠폰이라는 뜻이므로
 * 예외를 던지지 않고 false 를 돌려준다 — 동시 제출을 DB 가 막아준 정상 경로다.
 */
export async function recordRedemption(params: {
  couponId: string
  userId: string
  orderNumber: string
  discountAmount: number
}): Promise<boolean> {
  const { error } = await getSupabaseAdmin().from(REDEMPTION_TABLE).insert({
    coupon_id: params.couponId,
    user_id: params.userId,
    order_number: params.orderNumber,
    discount_amount: params.discountAmount,
  })

  if (!error) return true
  if (error.code === UNIQUE_VIOLATION) return false
  throw new Error(error.message)
}
