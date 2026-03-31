import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import { getToken } from 'next-auth/jwt'
import { supabase } from '@/lib/supabase'

// ─── 카테고리 한국어 라벨 ────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  banneton: '반느통',
  'baking-mold': '제과틀',
  'cookie-cutter': '쿠키틀',
  'pudding-mold': '푸딩틀',
  'cover-cloth': '커버천',
  tools: '도구',
  consumables: '소모품',
}

// ─── 숫자 → 한국어 금액 표기 ─────────────────────────────────
function toKoreanAmount(n: number): string {
  if (n === 0) return '영'
  const d = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
  function group(v: number): string {
    let r = ''
    const t = Math.floor(v / 1000); if (t) r += (t === 1 ? '' : d[t]) + '천'
    const h = Math.floor((v % 1000) / 100); if (h) r += (h === 1 ? '' : d[h]) + '백'
    const ten = Math.floor((v % 100) / 10); if (ten) r += (ten === 1 ? '' : d[ten]) + '십'
    const one = v % 10; if (one) r += d[one]
    return r
  }
  let result = ''
  const eok = Math.floor(n / 100000000); if (eok) result += group(eok) + '억'
  const man = Math.floor((n % 100000000) / 10000); if (man) result += group(man) + '만'
  const rest = n % 10000; if (rest) result += group(rest)
  return result
}

// ─── 주문번호 생성 ────────────────────────────────────────────
function generateOrderNumber(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const seq = String(now.getHours() * 100 + now.getMinutes()).padStart(4, '0')
  return `${yy}${mm}${dd}${seq}`
}

// ─── 엑셀 생성 ────────────────────────────────────────────────
function buildExcel(
  representative: string,
  phone: string,
  address: string,
  notes: string,
  cart: { product: { name: string; size?: string }; quantity: number }[]
): Buffer {
  const orderNumber = generateOrderNumber()
  const rows = cart.map((item) => ({
    성함: representative,
    전화번호: phone,
    주소: address,
    상품명: item.product.name + (item.product.size ? ` (${item.product.size})` : ''),
    수량: item.quantity,
    주문번호: orderNumber,
    배송메세지: notes,
  }))
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['성함', '전화번호', '주소', '상품명', '수량', '주문번호', '배송메세지'],
  })
  ws['!cols'] = [
    { wch: 12 }, { wch: 16 }, { wch: 36 },
    { wch: 24 }, { wch: 8 }, { wch: 14 }, { wch: 30 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// ─── 견적서 HTML 이메일 생성 ──────────────────────────────────
function buildQuoteEmail(
  companyName: string,
  cart: { product: { name: string; size?: string; category?: string; priceVatIncluded: number }; quantity: number }[],
  discountRate: number,
  totalBeforeDiscount: number,
  discountAmount: number,
  finalTotal: number,
  logoBase64: string,
  showRounding: boolean
): string {
  const today = new Date()
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')} (${['일','월','화','수','목','금','토'][today.getDay()]})`

  const discountLabel = discountRate === 0.15 ? '업체 특가<br>15% 할인 단가 적용' : discountRate === 0.12 ? '업체 특가<br>12% 할인 단가 적용' : '업체 특가<br>10% 할인 단가 적용'

  const productRows = cart.map((item, idx) => {
    const categoryLabel = CATEGORY_LABELS[item.product.category ?? ''] ?? ''
    const productLabel = item.product.name + (item.product.size ? ` (${item.product.size})` : '')
    const amount = item.product.priceVatIncluded * item.quantity
    const showNote = idx === 0 && discountRate > 0
    return `
    <tr>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center;color:#c0392b;">${categoryLabel}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center;">${productLabel}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center;">${item.quantity}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center;">EA</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:right;">${item.product.priceVatIncluded.toLocaleString()}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:right;">${amount.toLocaleString()}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center;font-size:12px;color:#c0392b;">${showNote ? discountLabel : ''}</td>
    </tr>`
  }).join('')

  // 빈 행 채우기 (최소 6행)
  const emptyRows = Math.max(0, 6 - cart.length)
  const emptyRowHtml = Array(emptyRows).fill(`
    <tr>
      <td style="border:1px solid #ccc;padding:7px 10px;">&nbsp;</td>
      <td style="border:1px solid #ccc;padding:7px 10px;"></td>
      <td style="border:1px solid #ccc;padding:7px 10px;"></td>
      <td style="border:1px solid #ccc;padding:7px 10px;"></td>
      <td style="border:1px solid #ccc;padding:7px 10px;"></td>
      <td style="border:1px solid #ccc;padding:7px 10px;"></td>
      <td style="border:1px solid #ccc;padding:7px 10px;"></td>
    </tr>`).join('')

  const discountRow = discountRate > 0 ? `
    <tr>
      <td colspan="5" style="border:1px solid #ccc;padding:7px 10px;text-align:center;background:#f5f5f5;">에누리</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:right;color:#c0392b;">(${discountAmount.toLocaleString()})</td>
      <td style="border:1px solid #ccc;padding:7px 10px;"></td>
    </tr>` : ''

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Malgun Gothic',sans-serif;background:#fff;color:#222;margin:0;padding:0;">
<div style="max-width:700px;margin:0 auto;padding:40px 30px;background:#fff;">

  <!-- 날짜 -->
  <div style="text-align:right;font-size:13px;margin-bottom:16px;">${dateStr}</div>

  <!-- 제목 -->
  <h1 style="text-align:center;font-size:28px;letter-spacing:16px;margin:0 0 30px;font-weight:bold;">견 적 서</h1>

  <!-- 업체명 + 공급자 정보 -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <tr>
      <td style="width:50%;vertical-align:bottom;padding-bottom:8px;">
        <span style="font-size:16px;font-weight:bold;border-bottom:2px solid #222;padding-bottom:4px;">
          ${companyName} 귀중
        </span>
      </td>
      <td style="width:50%;vertical-align:top;font-size:13px;line-height:2;">
        <table style="border-collapse:collapse;">
          <tr><td style="padding-right:8px;color:#555;">상&nbsp;&nbsp;&nbsp;&nbsp;호 :</td><td style="font-weight:bold;">화이트펭귄</td></tr>
          <tr><td style="color:#555;">대 표 자 :</td><td>최 석 원</td></tr>
          <tr><td style="color:#555;">주&nbsp;&nbsp;&nbsp;&nbsp;소 :</td><td>경기도 군포시 산본천로 33</td></tr>
          <tr><td style="color:#555;">연 락 처 :</td><td>050-6814-0627</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- 합계금액 -->
  <div style="font-size:14px;margin-bottom:6px;">
    합계금액 : <strong>${finalTotal.toLocaleString()} 원 (금 ${toKoreanAmount(finalTotal)}원)</strong>
  </div>
  <div style="font-size:12px;color:#555;margin-bottom:20px;">※ 부가가치세 포함</div>

  <div style="font-size:13px;margin-bottom:10px;">아래와 같이 납품함.</div>

  <!-- 상품 테이블 -->
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:0;">
    <thead>
      <tr style="background:#333;color:#fff;">
        <th style="border:1px solid #ccc;padding:8px 10px;width:12%;">품&nbsp;&nbsp;명</th>
        <th style="border:1px solid #ccc;padding:8px 10px;width:22%;">품&nbsp;&nbsp;목</th>
        <th style="border:1px solid #ccc;padding:8px 10px;width:8%;">수 량</th>
        <th style="border:1px solid #ccc;padding:8px 10px;width:8%;">단 위</th>
        <th style="border:1px solid #ccc;padding:8px 10px;width:12%;">단&nbsp;&nbsp;가</th>
        <th style="border:1px solid #ccc;padding:8px 10px;width:14%;">금 액(원)</th>
        <th style="border:1px solid #ccc;padding:8px 10px;width:24%;">비&nbsp;&nbsp;고</th>
      </tr>
    </thead>
    <tbody>
      ${productRows}
      ${emptyRowHtml}
      <!-- 소계 -->
      <tr style="background:#f0f0f0;">
        <td colspan="5" style="border:1px solid #ccc;padding:7px 10px;text-align:center;font-weight:bold;">소 계</td>
        <td style="border:1px solid #ccc;padding:7px 10px;text-align:right;color:#c0392b;">${totalBeforeDiscount.toLocaleString()}</td>
        <td style="border:1px solid #ccc;padding:7px 10px;"></td>
      </tr>
      ${discountRow}
      <!-- 최종 소계 -->
      <tr style="background:#f0f0f0;">
        <td colspan="5" style="border:1px solid #ccc;padding:7px 10px;text-align:center;font-weight:bold;">소 계</td>
        <td style="border:1px solid #ccc;padding:7px 10px;text-align:right;font-weight:bold;">${finalTotal.toLocaleString()}</td>
        <td style="border:1px solid #ccc;padding:7px 10px;text-align:center;font-size:12px;color:#555;">${showRounding ? '천원미만 절사' : ''}</td>
      </tr>
    </tbody>
  </table>

  <!-- 입금 계좌 -->
  <div style="font-size:13px;margin-top:16px;">
    ※ 입금 계좌 : 국민은행 712401-01-693592 최석원(화이트펭귄)
  </div>

  <!-- 로고 -->
  <div style="text-align:center;margin-top:40px;">
    <img src="${logoBase64}" alt="WHITE PENGUIN" style="height:40px;object-fit:contain;" />
  </div>

</div>
</body>
</html>`
}

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

    // ── 할인 계산 ──────────────────────────────────────────────
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0)
    const discountRate = totalQty >= 100 ? 0.15 : totalQty >= 50 ? 0.12 : totalQty >= 10 ? 0.10 : 0

    const totalBeforeDiscount = cart.reduce(
      (sum, item) => sum + item.product.priceVatIncluded * item.quantity, 0
    )
    const discountAmount = Math.round(totalBeforeDiscount * discountRate)
    const afterDiscount = totalBeforeDiscount - discountAmount
    // 10만원 이상일 때만 천원 미만 절사
    const finalTotal = afterDiscount >= 100000
      ? Math.floor(afterDiscount / 1000) * 1000
      : afterDiscount

    // ── 엑셀 생성 ──────────────────────────────────────────────
    const excelBuffer = buildExcel(representative, phone, address, notes, cart)
    const today = new Date()
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const excelFilename = `발주서_${companyName}_${dateStr}.xlsx`

    // ── 오너용 이메일 HTML ──────────────────────────────────────
    const productRows = cart.map((item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">
          ${item.product.name}${item.product.size ? ` (${item.product.size})` : ''}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px;">
          ${item.quantity}개
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;">
          ${(item.product.priceVatIncluded * item.quantity).toLocaleString()}원
        </td>
      </tr>`).join('')

    const ownerHtmlBody = `
<div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#333;">
  <div style="background:#333333;color:white;padding:24px;border-radius:10px 10px 0 0;">
    <h1 style="margin:0;font-size:20px;">📋 새 발주서가 접수되었습니다</h1>
    <p style="margin:6px 0 0;font-size:13px;opacity:0.75;">화이트펭귄 발주 시스템</p>
  </div>
  <div style="background:#fafafa;padding:24px;border:1px solid #eee;border-top:none;">
    <h2 style="font-size:14px;color:#666;margin:0 0 10px;">업체 정보</h2>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #eee;">
      <tr><td style="padding:9px 14px;color:#999;font-size:13px;width:110px;">업체명</td><td style="padding:9px 14px;font-weight:700;">${companyName}</td></tr>
      <tr style="background:#fafafa;"><td style="padding:9px 14px;color:#999;font-size:13px;">담당자명</td><td style="padding:9px 14px;">${representative}</td></tr>
      <tr><td style="padding:9px 14px;color:#999;font-size:13px;">연락처</td><td style="padding:9px 14px;">${phone}</td></tr>
      <tr style="background:#fafafa;"><td style="padding:9px 14px;color:#999;font-size:13px;">이메일</td><td style="padding:9px 14px;">${email}</td></tr>
      <tr><td style="padding:9px 14px;color:#999;font-size:13px;">배송지</td><td style="padding:9px 14px;">${address}</td></tr>
      ${businessNumber ? `<tr style="background:#fafafa;"><td style="padding:9px 14px;color:#999;font-size:13px;">사업자번호</td><td style="padding:9px 14px;">${businessNumber}</td></tr>` : ''}
      ${notes ? `<tr><td style="padding:9px 14px;color:#999;font-size:13px;">요청사항</td><td style="padding:9px 14px;">${notes}</td></tr>` : ''}
    </table>
    <h2 style="font-size:14px;color:#666;margin:24px 0 10px;">발주 상품 목록</h2>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #eee;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#666;">상품명</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;color:#666;width:70px;">수량</th>
          <th style="padding:10px 12px;text-align:right;font-size:13px;color:#666;width:110px;">금액</th>
        </tr>
      </thead>
      <tbody>${productRows}</tbody>
      <tfoot>
        <tr style="background:#f9f4ee;">
          <td colspan="2" style="padding:12px 14px;font-weight:700;font-size:15px;">
            합계 (VAT 포함)${discountRate > 0 ? ` · ${discountRate * 100}% 할인 적용` : ''}
          </td>
          <td style="padding:12px 14px;text-align:right;font-weight:900;font-size:17px;color:#333;">${finalTotal.toLocaleString()}원</td>
        </tr>
      </tfoot>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#888;">📎 발주서 엑셀 첨부: ${excelFilename}</p>
    ${bizFile && bizFile.size > 0 ? '<p style="margin:6px 0 0;font-size:13px;color:#888;">📎 사업자등록증 첨부</p>' : ''}
  </div>
  <div style="background:#efefef;padding:14px 24px;border-radius:0 0 10px 10px;font-size:12px;color:#aaa;text-align:center;">
    화이트펭귄 자동 발송 메일 · 이 메일에 직접 회신하지 마세요
  </div>
</div>`

    // ── 고객용 견적서 HTML ─────────────────────────────────────
    const logoPath = path.join(process.cwd(), 'public', 'logo-quote.png')
    const logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
    const customerHtmlBody = buildQuoteEmail(
      companyName, cart, discountRate, totalBeforeDiscount, discountAmount, finalTotal, logoBase64,
      afterDiscount >= 100000
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
      order_number: generateOrderNumber(),
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
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('발주 메일 전송 오류:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
