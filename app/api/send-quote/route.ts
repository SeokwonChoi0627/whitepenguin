import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getToken } from 'next-auth/jwt'
import { supabase } from '@/lib/supabase'
import { calculateOrderTotals } from '@/lib/pricing'
import { describeDiscount } from '@/lib/coupons'
import { resolveCouponForCart, resolveCouponRecordById } from '@/lib/coupon-resolver'
import { getCouponById, recordRedemption } from '@/lib/coupon-store'
import {
  buildExcel,
  buildOwnerEmail,
  buildQuoteEmail,
  escapeHtml,
  excelFilenameFor,
  generateOrderNumber,
  loadQuoteLogo,
} from '@/lib/quote-documents'

// ─── 메인 POST 핸들러 ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    const formData = await req.formData()

    const companyName = formData.get('companyName') as string
    const representative = formData.get('representative') as string
    const phone = formData.get('phone') as string
    const email = formData.get('email') as string
    const address = formData.get('address') as string
    const addressBase = (formData.get('addressBase') as string) || address
    const addressDetail = (formData.get('addressDetail') as string) || ''
    const businessNumber = formData.get('businessNumber') as string
    const notes = formData.get('notes') as string
    const cartJson = formData.get('cart') as string
    const bizFile = formData.get('bizFile') as File | null

    const cart: {
      product: {
        name: string
        size?: string
        category?: string
        priceVatIncluded: number
      }
      quantity: number
    }[] = JSON.parse(cartJson)

    // ── 주문번호는 한 번만 만들어 엑셀·DB·쿠폰 사용기록이 같은 값을 쓰게 한다 ──
    const orderNumber = generateOrderNumber()

    // ── 쿠폰 확인 + 금액 계산 ──────────────────────────────────
    // 클라이언트가 보낸 할인 금액은 쓰지 않는다. 쿠폰 코드/아이디만 받아
    // 서버에서 유효성을 다시 검사하고 금액을 새로 계산한다.
    const userId = (token?.id as string | undefined) ?? null
    const couponCode = (formData.get('couponCode') as string | null)?.trim() || null
    const couponId = (formData.get('couponId') as string | null)?.trim() || null

    let appliedCoupon: { id: string; name: string; code: string | null; summary: string } | null = null
    let totals = calculateOrderTotals(cart, null)

    if ((couponCode || couponId) && userId) {
      try {
        const resolved = couponId
          ? await (async () => {
              const c = await getCouponById(couponId)
              return c && c.auto_apply_to_members
                ? await resolveCouponRecordById(cart, c, userId)
                : null
            })()
          : await resolveCouponForCart(cart, couponCode, userId)

        if (resolved?.ok && resolved.coupon) {
          totals = resolved.totals
          appliedCoupon = {
            id: resolved.coupon.id,
            name: resolved.coupon.name,
            code: resolved.coupon.code,
            summary: describeDiscount(resolved.coupon),
          }
        } else if (resolved?.error) {
          // 쿠폰이 무효해도 발주 자체는 막지 않는다 — 할인 없이 진행하고 로그만 남긴다
          console.warn(`쿠폰 적용 불가 (${couponCode ?? couponId}): ${resolved.error}`)
        }
      } catch (err) {
        console.error('쿠폰 처리 오류 (할인 없이 진행):', err)
      }
    }

    // 쿠폰 사용을 기록한다. 유니크 제약에 걸리면(동시 제출) 할인을 되돌린다.
    if (appliedCoupon && userId) {
      const recorded = await recordRedemption({
        couponId: appliedCoupon.id,
        userId,
        orderNumber,
        discountAmount: totals.couponDiscountAmount,
      }).catch((err) => {
        console.error('쿠폰 사용기록 저장 오류:', err)
        return false
      })
      if (!recorded) {
        console.warn(`쿠폰 중복 사용 감지 — 할인 취소 (${appliedCoupon.id}/${userId})`)
        appliedCoupon = null
        totals = calculateOrderTotals(cart, null)
      }
    }

    const discountRate = totals.quantityDiscountRate
    const totalBeforeDiscount = totals.subtotal
    const discountAmount = totals.quantityDiscountAmount
    const finalTotal = totals.finalTotal

    // ── 엑셀 생성 ──────────────────────────────────────────────
    const excelBuffer = buildExcel(representative, phone, address, notes, cart, orderNumber)
    const excelFilename = excelFilenameFor(companyName)

    // ── 오너용 이메일 HTML ──────────────────────────────────────
    const ownerHtmlBody = buildOwnerEmail({
      headline: '📋 새 발주서가 접수되었습니다',
      companyName,
      representative,
      phone,
      email,
      address,
      businessNumber,
      notes,
      cart,
      extraFooterRowsHtml: appliedCoupon ? `
        <tr style="background:#fff8e7;">
          <td colspan="2" style="padding:10px 14px;font-size:14px;color:#8A6A3B;">
            🎟️ 쿠폰 할인 — ${escapeHtml(appliedCoupon.name)}${appliedCoupon.code ? ` (${escapeHtml(appliedCoupon.code)})` : ''}
          </td>
          <td style="padding:10px 14px;text-align:right;font-weight:700;font-size:14px;color:#c0392b;">
            -${totals.couponDiscountAmount.toLocaleString()}원
          </td>
        </tr>` : '',
      totalSuffix: discountRate > 0 ? ` · ${discountRate * 100}% 할인 적용` : '',
      finalTotal,
      excelFilename,
      hasBizFile: !!bizFile && bizFile.size > 0,
    })

    // ── 고객용 견적서 HTML ─────────────────────────────────────
    const logoBase64 = loadQuoteLogo()
    const customerHtmlBody = buildQuoteEmail(
      companyName, cart, discountRate, totalBeforeDiscount, discountAmount, finalTotal, logoBase64,
      totals.roundingAmount > 0,
      appliedCoupon
        ? { name: appliedCoupon.name, summary: appliedCoupon.summary, amount: totals.couponDiscountAmount }
        : null
    )

    // ── 메일 발송 ──────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: 'smtp.naver.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.NAVER_USER,
        pass: process.env.NAVER_PASS,
      },
    })

    const ownerAttachments: { filename: string; content: Buffer }[] = [
      { filename: excelFilename, content: excelBuffer },
    ]
    if (bizFile && bizFile.size > 0) {
      const buffer = Buffer.from(await bizFile.arrayBuffer())
      ownerAttachments.push({ filename: bizFile.name, content: buffer })
    }

    // 오너에게 발송 (발주서 + 엑셀)
    await transporter.sendMail({
      from: `"화이트펭귄 발주시스템" <${process.env.NAVER_USER}>`,
      to: 'swchoi157@naver.com',
      subject: `[화이트펭귄] 새 발주서 접수 — ${companyName}`,
      html: ownerHtmlBody,
      attachments: ownerAttachments,
    })

    // 고객에게 발송 (견적서)
    if (email) {
      await transporter.sendMail({
        from: `"화이트펭귄" <${process.env.NAVER_USER}>`,
        to: email,
        subject: `[화이트펭귄] 발주 접수 확인 및 견적서 — ${companyName}`,
        html: customerHtmlBody,
      })
    }

    // ── Supabase DB 저장 ───────────────────────────────────────
    await supabase.from('quotes').insert({
      order_number: orderNumber,
      user_id: token?.id as string | null ?? null,
      company_name: companyName,
      representative,
      phone,
      email,
      address,
      business_number: businessNumber || null,
      notes: notes || null,
      cart,
      total_amount: totalBeforeDiscount,
      discount_rate: discountRate,
      final_total: finalTotal,
      coupon_id: appliedCoupon?.id ?? null,
      coupon_name: appliedCoupon?.name ?? null,
      coupon_discount: totals.couponDiscountAmount || null,
    })

    // ── 로그인 사용자: 프로필에 발주서 정보 자동 저장 ─────────────
    // 다음 주문 시 기본값으로 로드되도록 users 테이블을 업데이트 (덮어쓰기).
    // 실패해도 발주 자체는 성공으로 처리 (프로필 저장은 부가 기능).
    if (token?.id) {
      const profileUpdate: Record<string, string | null> = {}
      if (representative) profileUpdate.name = representative
      if (companyName) profileUpdate.company_name = companyName
      if (phone) profileUpdate.phone = phone
      if (businessNumber) profileUpdate.business_number = businessNumber
      if (addressBase) profileUpdate.address = addressBase
      if (addressDetail) profileUpdate.address_detail = addressDetail
      if (Object.keys(profileUpdate).length > 0) {
        const { error: upErr } = await supabase
          .from('users')
          .update(profileUpdate)
          .eq('id', token.id)
        if (upErr) console.error('프로필 자동 저장 실패 (무시):', upErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('발주 메일 전송 오류:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
