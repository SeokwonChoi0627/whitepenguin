// 반품요청 서버 전용 데이터 접근 — service_role 클라이언트로만 동작한다.
// 환급계좌가 들어있는 테이블이므로 클라이언트 컴포넌트에서 import 하지 말 것.

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { itemKey, type ReturnItem, type ReturnRequestRecord } from '@/lib/returns'

export const RETURN_TABLE = 'return_requests'

/** 마이페이지 목록에 필요한 최소 컬럼 — 계좌 정보는 제외한다 */
export const RETURN_SUMMARY_COLUMNS =
  'id, return_number, order_number, reason, items, status, admin_note, created_at'

export type ReturnRequestSummary = Pick<
  ReturnRequestRecord,
  'id' | 'return_number' | 'order_number' | 'reason' | 'items' | 'status' | 'admin_note' | 'created_at'
>

/** 연속 접수 제한 — 이 시간 안에 다시 신청하면 거절한다 (메일 폭주·중복 제출 방지) */
export const SUBMIT_COOLDOWN_SECONDS = 30

/**
 * 직전 접수로부터 쿨다운이 지났는지 확인한다.
 * 접수 1건마다 메일이 최대 2통 나가므로, 연타·자동화 제출을 막는 최소한의 방어선이다.
 */
export async function secondsUntilNextSubmitAllowed(userId: string): Promise<number> {
  const { data, error } = await getSupabaseAdmin()
    .from(RETURN_TABLE)
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw new Error(error.message)
  const last = data?.[0]?.created_at
  if (!last) return 0

  const elapsed = (Date.now() - new Date(last).getTime()) / 1000
  return Math.max(0, Math.ceil(SUBMIT_COOLDOWN_SECONDS - elapsed))
}

/** 사용자의 반품요청 목록 (최신순) */
export async function listUserReturnRequests(userId: string): Promise<ReturnRequestSummary[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(RETURN_TABLE)
    .select(RETURN_SUMMARY_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ReturnRequestSummary[]
}

/** 특정 주문에 대해 이미 신청된 반품요청 (반려 건은 수량 계산에서 제외) */
export async function listActiveReturnsForOrder(
  userId: string,
  orderNumber: string
): Promise<Pick<ReturnRequestRecord, 'items' | 'status' | 'return_number'>[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(RETURN_TABLE)
    .select('items, status, return_number')
    .eq('user_id', userId)
    .eq('order_number', orderNumber)
    .neq('status', 'rejected')

  if (error) throw new Error(error.message)
  return (data ?? []) as Pick<ReturnRequestRecord, 'items' | 'status' | 'return_number'>[]
}

/**
 * 이미 반품 신청된 수량을 상품별로 합산한다.
 * 부분 반품을 여러 번 나눠 신청하더라도 총합이 발주 수량을 넘지 않도록 하는 데 쓴다.
 */
export function sumReturnedQuantities(
  requests: { items: ReturnItem[] }[]
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const request of requests) {
    for (const item of request.items ?? []) {
      const key = itemKey(item.name, item.size)
      totals.set(key, (totals.get(key) ?? 0) + item.quantity)
    }
  }
  return totals
}
