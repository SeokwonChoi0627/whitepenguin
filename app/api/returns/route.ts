import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAdminEmail, adminNotifyAddresses } from '@/lib/admin'
import { getTransporter, mailFrom } from '@/lib/mailer'
import {
  buildAdminReturnEmail,
  buildCustomerReturnEmail,
  type ReturnMailData,
} from '@/lib/emails/return-request'
import {
  MAX_RETURN_PHOTOS,
  RETURN_PHOTO_BUCKET,
  generateReturnNumber,
  itemKey,
  normalizeAccountNumber,
  productLabel,
  validateReturnRequest,
  type ReturnItem,
  type ReturnRequestInput,
} from '@/lib/returns'
import {
  RETURN_TABLE,
  RETURN_SUMMARY_COLUMNS,
  listActiveReturnsForOrder,
  listUserReturnRequests,
  secondsUntilNextSubmitAllowed,
  sumReturnedQuantities,
} from '@/lib/return-requests'

interface QuoteRow {
  id: string
  order_number: string
  user_id: string | null
  company_name: string | null
  representative: string | null
  phone: string | null
  email: string | null
  address: string | null
  cart: { product: { name: string; size?: string }; quantity: number }[] | null
}

/** 발주 cart(JSON)를 반품 품목 대조용 구조로 변환. 동일 상품이 여러 줄이면 합산한다. */
function toOrderedItems(cart: QuoteRow['cart']): ReturnItem[] {
  const merged = new Map<string, ReturnItem>()
  for (const line of cart ?? []) {
    const name = line.product?.name
    if (!name) continue
    const key = itemKey(name, line.product.size)
    const existing = merged.get(key)
    if (existing) {
      merged.set(key, { ...existing, orderedQuantity: existing.orderedQuantity + line.quantity })
    } else {
      merged.set(key, {
        name,
        size: line.product.size,
        quantity: 0,
        orderedQuantity: line.quantity,
      })
    }
  }
  return Array.from(merged.values())
}

/**
 * 증빙 사진은 우리 Supabase 스토리지의 지정 버킷에 올라간 것만 허용한다.
 * 외부 URL 은 관리자 메일에 외부 이미지를 로드시키고,
 * 같은 프로젝트의 다른 버킷은 이 반품 건과 무관한 파일을 끼워 넣는 통로가 된다.
 */
function isOwnStorageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const base = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return false
  try {
    const url = new URL(value)
    return (
      url.origin === new URL(base).origin &&
      url.pathname.startsWith(`/storage/v1/object/public/${RETURN_PHOTO_BUCKET}/`)
    )
  } catch {
    return false
  }
}

function parseInput(body: unknown): ReturnRequestInput | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (typeof b.orderNumber !== 'string' || typeof b.reason !== 'string') return null
  if (!Array.isArray(b.items)) return null

  const items = b.items
    .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
    .map((i) => ({
      name: String(i.name ?? ''),
      size: i.size === undefined || i.size === null || i.size === '' ? undefined : String(i.size),
      quantity: Number(i.quantity ?? 0),
    }))
    .filter((i) => i.name && i.quantity > 0)

  const photos = Array.isArray(b.photos)
    ? b.photos.filter(isOwnStorageUrl).slice(0, MAX_RETURN_PHOTOS)
    : []

  return {
    orderNumber: b.orderNumber.trim(),
    reason: b.reason as ReturnRequestInput['reason'],
    reasonDetail: typeof b.reasonDetail === 'string' ? b.reasonDetail.trim() : '',
    items,
    refundBank: typeof b.refundBank === 'string' ? b.refundBank.trim() : '',
    refundAccount: typeof b.refundAccount === 'string' ? b.refundAccount : '',
    refundHolder: typeof b.refundHolder === 'string' ? b.refundHolder.trim() : '',
    pickupAddress: typeof b.pickupAddress === 'string' ? b.pickupAddress.trim() : '',
    pickupAddressDetail:
      typeof b.pickupAddressDetail === 'string' ? b.pickupAddressDetail.trim() : '',
    photos,
  }
}

// ─── 목록 조회 ────────────────────────────────────────────────
// 일반 사용자: 본인 신청 건 요약 / 관리자: 전체 (환급계좌 포함)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const user = session.user as { id?: string; email?: string }

  try {
    if (isAdminEmail(user.email) && req.nextUrl.searchParams.get('scope') === 'all') {
      const { data, error } = await getSupabaseAdmin()
        .from(RETURN_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw new Error(error.message)
      return NextResponse.json(data ?? [])
    }

    if (!user.id) return NextResponse.json([])
    return NextResponse.json(await listUserReturnRequests(user.id))
  } catch (err) {
    console.error('반품요청 조회 오류:', err)
    return NextResponse.json({ error: '반품요청을 불러오지 못했습니다.' }, { status: 500 })
  }
}

// ─── 반품요청 접수 ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const user = session.user as {
    id?: string
    email?: string
    name?: string
    phone?: string
    companyName?: string
  }
  if (!user.id) {
    return NextResponse.json({ error: '계정 정보를 확인할 수 없습니다. 다시 로그인해 주세요.' }, { status: 401 })
  }

  const input = parseInput(await req.json().catch(() => null))
  if (!input) return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })

  // ── 연속 접수 제한 ──────────────────────────────────────────
  try {
    const wait = await secondsUntilNextSubmitAllowed(user.id)
    if (wait > 0) {
      return NextResponse.json(
        { error: `방금 접수한 반품요청이 있습니다. ${wait}초 후 다시 시도해 주세요.` },
        { status: 429 }
      )
    }
  } catch (err) {
    console.error('반품요청 접수 간격 확인 오류:', err)
    return NextResponse.json({ error: '반품 내역을 확인하지 못했습니다.' }, { status: 500 })
  }

  // ── 본인 주문인지 확인 ──────────────────────────────────────
  const { data: quotes, error: quoteError } = await supabase
    .from('quotes')
    .select('id, order_number, user_id, company_name, representative, phone, email, address, cart')
    .eq('order_number', input.orderNumber)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (quoteError) {
    console.error('발주 조회 오류:', quoteError)
    return NextResponse.json({ error: '주문 정보를 확인하지 못했습니다.' }, { status: 500 })
  }
  const quote = (quotes?.[0] ?? null) as QuoteRow | null
  if (!quote) {
    return NextResponse.json({ error: '본인의 발주 내역에서만 반품을 신청할 수 있습니다.' }, { status: 404 })
  }

  const orderedItems = toOrderedItems(quote.cart)

  // ── 입력값 검증 (발주 수량 대조 포함) ────────────────────────
  const validation = validateReturnRequest(input, orderedItems)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // ── 기존 신청분과 합산해 발주 수량 초과 여부 확인 ────────────
  let alreadyReturned: Map<string, number>
  try {
    alreadyReturned = sumReturnedQuantities(await listActiveReturnsForOrder(user.id, input.orderNumber))
  } catch (err) {
    console.error('기존 반품요청 조회 오류:', err)
    return NextResponse.json({ error: '반품 내역을 확인하지 못했습니다.' }, { status: 500 })
  }

  const orderedMap = new Map(orderedItems.map((o) => [itemKey(o.name, o.size), o.orderedQuantity]))
  for (const item of input.items) {
    const key = itemKey(item.name, item.size)
    const ordered = orderedMap.get(key) ?? 0
    const previous = alreadyReturned.get(key) ?? 0
    if (previous + item.quantity > ordered) {
      const remaining = Math.max(0, ordered - previous)
      return NextResponse.json(
        {
          error:
            `${productLabel(item.name, item.size)} 은(는) 이미 ${previous}개가 반품 신청되어 ` +
            `${remaining}개까지만 추가 신청할 수 있습니다.`,
        },
        { status: 409 }
      )
    }
  }

  // ── 저장 ────────────────────────────────────────────────────
  const items: ReturnItem[] = input.items.map((i) => ({
    name: i.name,
    size: i.size,
    quantity: i.quantity,
    orderedQuantity: orderedMap.get(itemKey(i.name, i.size)) ?? i.quantity,
  }))
  const pickupAddress = input.pickupAddressDetail
    ? `${input.pickupAddress} ${input.pickupAddressDetail}`
    : input.pickupAddress
  const refundAccount = normalizeAccountNumber(input.refundAccount)

  const row = {
    order_number: quote.order_number,
    quote_id: quote.id,
    user_id: user.id,
    company_name: quote.company_name ?? user.companyName ?? null,
    representative: quote.representative ?? user.name ?? null,
    phone: quote.phone ?? user.phone ?? null,
    email: quote.email ?? user.email ?? null,
    reason: input.reason,
    reason_detail: input.reasonDetail || null,
    items,
    refund_bank: input.refundBank,
    refund_account: refundAccount,
    refund_holder: input.refundHolder,
    pickup_address: input.pickupAddress,
    pickup_address_detail: input.pickupAddressDetail || null,
    photos: input.photos,
    status: 'requested',
  }

  const saved = await insertWithUniqueReturnNumber(row)
  if (!saved) {
    return NextResponse.json(
      { error: '반품요청 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    )
  }
  const { returnNumber, inserted } = saved

  // ── 메일 발송 ───────────────────────────────────────────────
  // 저장은 이미 끝났으므로, 메일이 실패해도 접수 자체는 유효하다.
  // 관리자 화면(/admin/returns)에서 확인 가능하며 결과는 mailSent 로 알린다.
  const mailData: ReturnMailData = {
    returnNumber,
    orderNumber: quote.order_number,
    companyName: quote.company_name ?? user.companyName ?? '',
    representative: quote.representative ?? user.name ?? '',
    phone: quote.phone ?? user.phone ?? '',
    email: quote.email ?? user.email ?? '',
    reason: input.reason,
    reasonDetail: input.reasonDetail,
    items,
    refundBank: input.refundBank,
    refundAccount,
    refundHolder: input.refundHolder,
    pickupAddress,
    photos: input.photos,
    createdAt: new Date(),
  }

  const mailSent = await sendReturnMails(mailData)

  return NextResponse.json({ ok: true, returnNumber, mailSent, request: inserted })
}

const UNIQUE_VIOLATION = '23505'
const RETURN_NUMBER_RETRIES = 5

/**
 * 반품번호는 날짜 + 난수라 같은 날 충돌할 수 있다.
 * 유니크 제약에 걸리면 번호만 새로 뽑아 재시도한다.
 */
async function insertWithUniqueReturnNumber(
  row: Record<string, unknown>
): Promise<{ returnNumber: string; inserted: unknown } | null> {
  for (let attempt = 0; attempt < RETURN_NUMBER_RETRIES; attempt++) {
    const returnNumber = generateReturnNumber()
    const { data, error } = await getSupabaseAdmin()
      .from(RETURN_TABLE)
      .insert({ ...row, return_number: returnNumber })
      .select(RETURN_SUMMARY_COLUMNS)
      .single()

    if (!error) return { returnNumber, inserted: data }
    if (error.code !== UNIQUE_VIOLATION) {
      console.error('반품요청 저장 오류:', error)
      return null
    }
    console.warn(`반품번호 중복(${returnNumber}) — 재발급 후 재시도`)
  }
  console.error(`반품번호를 ${RETURN_NUMBER_RETRIES}회 시도했으나 모두 중복되었습니다.`)
  return null
}

/** 관리자 알림 + 고객 확인 메일 발송. 관리자 메일 성공 여부를 반환한다. */
async function sendReturnMails(mailData: ReturnMailData): Promise<boolean> {
  const recipients = adminNotifyAddresses()
  let adminMailSent = false

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail({
      from: mailFrom('화이트펭귄 반품접수'),
      to: recipients.join(', '),
      subject: `[화이트펭귄] 반품요청 접수 — ${mailData.companyName || mailData.representative} (${mailData.returnNumber})`,
      html: buildAdminReturnEmail(mailData),
    })
    // 수신 거부된 주소가 있으면 로그에 남긴다 — 조용히 사라지는 것을 막는다
    if (info.rejected?.length) {
      console.error('반품 알림 메일 거부된 수신자:', info.rejected)
    }
    adminMailSent = (info.accepted?.length ?? 0) > 0
    console.log(
      `반품 알림 메일 발송 (${mailData.returnNumber}) → 수락 ${info.accepted?.length ?? 0}건 / ` +
      `거부 ${info.rejected?.length ?? 0}건`
    )
  } catch (err) {
    console.error(`반품 알림 메일 발송 실패 (${mailData.returnNumber}) → ${recipients.join(', ')}:`, err)
    return false
  }

  // 고객 확인 메일은 부가 기능이라, 실패해도 관리자 알림 성공 여부를 뒤집지 않는다
  if (mailData.email) {
    try {
      await getTransporter().sendMail({
        from: mailFrom(),
        to: mailData.email,
        subject: `[화이트펭귄] 반품요청 접수 확인 — ${mailData.returnNumber}`,
        html: buildCustomerReturnEmail(mailData),
      })
    } catch (err) {
      console.error('고객 확인 메일 발송 실패 (접수는 유효):', err)
    }
  }

  return adminMailSent
}
