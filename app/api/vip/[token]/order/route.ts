import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTS } from '@/lib/products'
import { getSoldOutProducts } from '@/app/actions/sold-out'
import { supabase } from '@/lib/supabase'
import { getTransporter, mailFrom } from '@/lib/mailer'
import { adminNotifyAddresses } from '@/lib/admin'
import {
  buildVipCatalog,
  cleanText,
  isVipLinkUsable,
  priceVipOrder,
  validateVipContact,
  type VipContact,
} from '@/lib/vip'
import { getVipLinkByToken, markVipLinkOrdered } from '@/lib/vip-store'
import {
  buildExcel,
  buildOwnerEmail,
  buildQuoteEmail,
  excelFilenameFor,
  generateOrderNumber,
  loadQuoteLogo,
} from '@/lib/quote-documents'

const NOTES_MAX = 500
/** 같은 링크로 연달아 발주할 수 있는 최소 간격 — 반복 요청으로 메일을 폭주시키는 것을 막는다 */
const MIN_ORDER_INTERVAL_MS = 60_000

/**
 * VIP 시크릿 발주.
 *
 * 링크 토큰이 곧 접근 권한이다. 가격은 화면이 보낸 값을 쓰지 않고
 * 링크 설정(할인율·개별가)으로 서버에서 다시 계산한다.
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  let link
  try {
    link = await getVipLinkByToken(params.token)
  } catch (err) {
    console.error('VIP 링크 조회 오류:', err)
    return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 500 })
  }
  if (!link || !isVipLinkUsable(link)) {
    return NextResponse.json({ error: '유효하지 않거나 만료된 링크입니다.' }, { status: 404 })
  }

  if (link.last_ordered_at && Date.now() - new Date(link.last_ordered_at).getTime() < MIN_ORDER_INTERVAL_MS) {
    return NextResponse.json(
      { error: '방금 발주가 접수되었습니다. 추가 발주는 1분 후에 다시 시도해 주세요.' },
      { status: 429 }
    )
  }

  const body = await req.json().catch(() => null)
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }
  const b = body as Record<string, unknown>

  const contact: VipContact = {
    company_name: cleanText(b.companyName),
    representative: cleanText(b.representative),
    phone: cleanText(b.phone),
    email: cleanText(b.email),
    address: cleanText(b.address),
    business_number: cleanText(b.businessNumber),
  }
  const contactCheck = validateVipContact(contact)
  if (!contactCheck.ok) return NextResponse.json({ error: contactCheck.error }, { status: 400 })

  const notes = cleanText(b.notes)
  if (notes && notes.length > NOTES_MAX) {
    return NextResponse.json({ error: `요청사항은 ${NOTES_MAX}자 이내로 입력해 주세요.` }, { status: 400 })
  }

  const catalog = buildVipCatalog(PRODUCTS, link, await getSoldOutProducts())
  const priced = priceVipOrder(b.items, catalog)
  if (!priced.ok) return NextResponse.json({ error: priced.error }, { status: 400 })

  const companyName = contact.company_name!
  const representative = contact.representative!
  const phone = contact.phone!
  const address = contact.address!
  const email = contact.email ?? ''
  const orderNumber = generateOrderNumber()
  const cart = priced.lines
  const total = priced.total

  // ── 오너 알림 — 관리자 발주 목록 화면이 없으므로 이 메일이 곧 접수 기록이다 ──
  const excelFilename = excelFilenameFor(companyName)
  try {
    await getTransporter().sendMail({
      from: mailFrom('화이트펭귄 발주시스템'),
      to: adminNotifyAddresses(),
      subject: `[화이트펭귄] VIP 발주 접수 — ${companyName}`,
      html: buildOwnerEmail({
        headline: `⭐ VIP 시크릿 발주 — ${link.label}`,
        companyName,
        representative,
        phone,
        email,
        address,
        businessNumber: contact.business_number,
        notes,
        cart,
        totalSuffix: ' · VIP 가격 적용',
        finalTotal: total,
        excelFilename,
      }),
      attachments: [
        { filename: excelFilename, content: buildExcel(representative, phone, address, notes ?? '', cart, orderNumber) },
      ],
    })
  } catch (err) {
    console.error('VIP 발주 오너 메일 발송 실패:', err)
    return NextResponse.json(
      { error: '발주 접수에 실패했습니다. 잠시 후 다시 시도하거나 고객센터로 연락해 주세요.' },
      { status: 500 }
    )
  }

  // 여기부터는 실패해도 발주는 접수된 것이다 — 고객이 다시 눌러 중복 발주하지 않도록 성공으로 응답한다.
  if (email) {
    try {
      await getTransporter().sendMail({
        from: mailFrom(),
        to: email,
        subject: `[화이트펭귄] 발주 접수 확인 및 견적서 — ${companyName}`,
        html: buildQuoteEmail(companyName, cart, 0, total, 0, total, loadQuoteLogo(), false, null, 'VIP 특가<br>단가 적용'),
      })
    } catch (err) {
      console.error('VIP 발주 고객 견적서 발송 실패 (발주는 접수됨):', err)
    }
  }

  const { error: insertError } = await supabase.from('quotes').insert({
    order_number: orderNumber,
    user_id: null,
    company_name: companyName,
    representative,
    phone,
    email,
    address,
    business_number: contact.business_number,
    notes,
    cart,
    total_amount: total,
    discount_rate: 0,
    final_total: total,
    vip_link_id: link.id,
  })
  if (insertError) console.error('VIP 발주 DB 저장 실패 (메일은 발송됨):', insertError)

  await markVipLinkOrdered(link.id).catch((err) => console.error('VIP 링크 최근 발주일 갱신 실패:', err))

  return NextResponse.json({ ok: true, orderNumber, total })
}
