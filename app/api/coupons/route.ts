import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAdminEmail } from '@/lib/admin'
import {
  normalizeCouponCode,
  validateCouponInput,
  type CouponInput,
  type DiscountType,
} from '@/lib/coupons'
import {
  COUPON_TABLE,
  countRedemptionsByCoupon,
  listAllCoupons,
  listMemberCoupons,
} from '@/lib/coupon-store'

/** 요청 본문을 쿠폰 입력으로 정규화한다. 형식이 어긋나면 null */
function parseCouponInput(body: unknown): CouponInput | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>

  const str = (v: unknown): string | null => {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t === '' ? null : t
  }
  const int = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? Math.trunc(n) : null
  }

  const rawCode = str(b.code)
  return {
    code: rawCode ? normalizeCouponCode(rawCode) : null,
    name: typeof b.name === 'string' ? b.name.trim() : '',
    description: str(b.description),
    discount_type: b.discount_type as DiscountType,
    discount_value: int(b.discount_value) ?? 0,
    min_order_amount: int(b.min_order_amount) ?? 0,
    max_discount_amount: int(b.max_discount_amount),
    starts_at: str(b.starts_at),
    expires_at: str(b.expires_at),
    max_redemptions: int(b.max_redemptions),
    auto_apply_to_members: b.auto_apply_to_members === true,
    is_active: b.is_active !== false,
  }
}

// ─── 목록 조회 ────────────────────────────────────────────────
// 일반 사용자: 내가 코드 없이 쓸 수 있는 쿠폰 / 관리자(scope=all): 전체 + 사용 현황
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const user = session.user as { id?: string; email?: string }

  try {
    if (req.nextUrl.searchParams.get('scope') === 'all') {
      if (!isAdminEmail(user.email)) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }
      const [coupons, counts] = await Promise.all([listAllCoupons(), countRedemptionsByCoupon()])
      return NextResponse.json(
        coupons.map((c) => ({ ...c, redemption_count: counts.get(c.id) ?? 0 }))
      )
    }

    if (!user.id) return NextResponse.json([])
    return NextResponse.json(await listMemberCoupons(user.id))
  } catch (err) {
    console.error('쿠폰 조회 오류:', err)
    return NextResponse.json({ error: '쿠폰을 불러오지 못했습니다.' }, { status: 500 })
  }
}

// ─── 쿠폰 생성 (관리자) ───────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as { email?: string } | undefined
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const input = parseCouponInput(await req.json().catch(() => null))
  if (!input) return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })

  const validation = validateCouponInput(input)
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })

  const { data, error } = await getSupabaseAdmin()
    .from(COUPON_TABLE)
    .insert(input)
    .select('*')
    .single()

  if (error) {
    // 코드 중복은 사용자가 고칠 수 있는 입력 오류이므로 구분해서 알린다
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 사용 중인 쿠폰 코드입니다.' }, { status: 409 })
    }
    console.error('쿠폰 생성 오류:', error)
    return NextResponse.json({ error: '쿠폰 생성에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json(data)
}
