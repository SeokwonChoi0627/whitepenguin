import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAdminEmail } from '@/lib/admin'
import { normalizeCouponCode, validateCouponInput, type CouponInput } from '@/lib/coupons'
import { COUPON_TABLE, getCouponById } from '@/lib/coupon-store'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { email?: string } | undefined
  return isAdminEmail(user?.email)
}

/** 관리자: 쿠폰 수정 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const existing = await getCouponById(params.id)
  if (!existing) return NextResponse.json({ error: '쿠폰을 찾을 수 없습니다.' }, { status: 404 })

  const b = body as Record<string, unknown>
  // 보내온 필드만 덮어쓰고 나머지는 기존 값을 유지한 뒤, 합쳐진 결과를 검증한다
  const merged: CouponInput = {
    code: 'code' in b
      ? (typeof b.code === 'string' && b.code.trim() ? normalizeCouponCode(b.code) : null)
      : existing.code,
    name: 'name' in b ? String(b.name ?? '').trim() : existing.name,
    description: 'description' in b
      ? (typeof b.description === 'string' && b.description.trim() ? b.description.trim() : null)
      : existing.description,
    discount_type: 'discount_type' in b ? (b.discount_type as CouponInput['discount_type']) : existing.discount_type,
    discount_value: 'discount_value' in b ? Math.trunc(Number(b.discount_value)) : existing.discount_value,
    min_order_amount: 'min_order_amount' in b ? Math.trunc(Number(b.min_order_amount)) : existing.min_order_amount,
    max_discount_amount: 'max_discount_amount' in b
      ? (b.max_discount_amount === null || b.max_discount_amount === '' ? null : Math.trunc(Number(b.max_discount_amount)))
      : existing.max_discount_amount,
    starts_at: 'starts_at' in b ? (b.starts_at ? String(b.starts_at) : null) : existing.starts_at,
    expires_at: 'expires_at' in b ? (b.expires_at ? String(b.expires_at) : null) : existing.expires_at,
    max_redemptions: 'max_redemptions' in b
      ? (b.max_redemptions === null || b.max_redemptions === '' ? null : Math.trunc(Number(b.max_redemptions)))
      : existing.max_redemptions,
    auto_apply_to_members: 'auto_apply_to_members' in b
      ? b.auto_apply_to_members === true : existing.auto_apply_to_members,
    is_active: 'is_active' in b ? b.is_active !== false : existing.is_active,
  }

  const validation = validateCouponInput(merged)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

  const { data, error } = await getSupabaseAdmin()
    .from(COUPON_TABLE)
    .update(merged)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 사용 중인 쿠폰 코드입니다.' }, { status: 409 })
    }
    console.error('쿠폰 수정 오류:', error)
    return NextResponse.json({ error: '쿠폰 수정에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json(data)
}

/**
 * 관리자: 쿠폰 삭제.
 * 사용 기록이 있으면 지우지 않고 비활성화만 한다 — 지난 발주의 할인 근거가 사라지면 안 된다.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const { count, error: countError } = await admin
    .from('coupon_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', params.id)

  if (countError) {
    console.error('쿠폰 사용기록 조회 오류:', countError)
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
  }

  if ((count ?? 0) > 0) {
    const { error } = await admin
      .from(COUPON_TABLE)
      .update({ is_active: false })
      .eq('id', params.id)
    if (error) {
      console.error('쿠폰 비활성화 오류:', error)
      return NextResponse.json({ error: '비활성화에 실패했습니다.' }, { status: 500 })
    }
    return NextResponse.json({
      ok: true,
      deactivated: true,
      message: `사용 기록이 ${count}건 있어 삭제 대신 비활성화했습니다.`,
    })
  }

  const { error } = await admin.from(COUPON_TABLE).delete().eq('id', params.id)
  if (error) {
    console.error('쿠폰 삭제 오류:', error)
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deactivated: false })
}
