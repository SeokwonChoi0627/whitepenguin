import 'server-only'

// 발주 문서(엑셀·견적서·오너 알림 메일) 생성 — 일반 발주(send-quote)와 VIP 발주가 함께 쓴다.

import * as XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import { BANK_ACCOUNT_TEXT, DEPOSIT_NOTICE } from './payment'


// ─── 카테고리 한국어 라벨 ────────────────────────────────────
export const CATEGORY_LABELS: Record<string, string> = {
  banneton: '반느통',
  'baking-mold': '제과틀',
  'cookie-cutter': '쿠키틀',
  'pudding-mold': '푸딩틀',
  'cover-cloth': '커버천',
  tools: '도구',
  consumables: '소모품',
}

// ─── 숫자 → 한국어 금액 표기 ─────────────────────────────────
export function toKoreanAmount(n: number): string {
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
export function generateOrderNumber(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const seq = String(now.getHours() * 100 + now.getMinutes()).padStart(4, '0')
  return `${yy}${mm}${dd}${seq}`
}

// ─── 엑셀 생성 ────────────────────────────────────────────────
// ─── 전화번호 포맷 정규화 ─────────────────────────────────────
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return raw // 형식이 맞지 않으면 원본 그대로
}

export function buildExcel(
  representative: string,
  phone: string,
  address: string,
  notes: string,
  cart: { product: { name: string; size?: string }; quantity: number }[],
  orderNumber: string
): Buffer {
  const formattedPhone = formatPhone(phone)
  const rows = cart.map((item) => ({
    성함: representative,
    전화번호: formattedPhone,
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

  // 전화번호 열(B열) 전체를 텍스트 서식으로 지정 — 앞자리 0 보존
  const rowCount = rows.length
  for (let r = 1; r <= rowCount; r++) {
    const cellRef = `B${r + 1}` // 헤더(B1) 제외, 데이터는 B2부터
    if (ws[cellRef]) ws[cellRef].t = 's'
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// ─── 견적서 HTML 이메일 생성 ──────────────────────────────────
export interface QuoteCouponLine {
  name: string
  summary: string
  amount: number
}

export function buildQuoteEmail(
  companyName: string,
  cart: { product: { name: string; size?: string; category?: string; priceVatIncluded: number }; quantity: number }[],
  discountRate: number,
  totalBeforeDiscount: number,
  discountAmount: number,
  finalTotal: number,
  logoBase64: string,
  showRounding: boolean,
  couponLine: QuoteCouponLine | null,
  /** 첫 행 비고란 문구(HTML). 없으면 수량 할인 문구를 쓴다 */
  remarkHtml?: string
): string {
  const today = new Date()
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')} (${['일','월','화','수','목','금','토'][today.getDay()]})`

  const discountLabel = discountRate === 0.15 ? '업체 특가<br>15% 할인 단가 적용' : discountRate === 0.12 ? '업체 특가<br>12% 할인 단가 적용' : '업체 특가<br>10% 할인 단가 적용'

  const productRows = cart.map((item, idx) => {
    const categoryLabel = CATEGORY_LABELS[item.product.category ?? ''] ?? ''
    const productLabel = escapeHtml(item.product.name + (item.product.size ? ` (${item.product.size})` : ''))
    const quantity = Number(item.quantity)
    const unitPrice = Number(item.product.priceVatIncluded)
    const amount = unitPrice * quantity
    const note = idx !== 0 ? '' : remarkHtml ?? (discountRate > 0 ? discountLabel : '')
    return `
    <tr>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center;color:#c0392b;">${categoryLabel}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center;">${productLabel}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center;">${quantity}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center;">EA</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:right;">${unitPrice.toLocaleString()}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:right;">${amount.toLocaleString()}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center;font-size:12px;color:#c0392b;">${note}</td>
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

  const couponRow = couponLine ? `
    <tr>
      <td colspan="5" style="border:1px solid #ccc;padding:7px 10px;text-align:center;background:#f5f5f5;">
        쿠폰 할인<br /><span style="font-size:11px;color:#777;">${escapeHtml(couponLine.name)} · ${escapeHtml(couponLine.summary)}</span>
      </td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:right;color:#c0392b;">(${couponLine.amount.toLocaleString()})</td>
      <td style="border:1px solid #ccc;padding:7px 10px;"></td>
    </tr>` : ''

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
          ${escapeHtml(companyName)} 귀중
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
      ${couponRow}
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
    ※ 입금 계좌 : ${BANK_ACCOUNT_TEXT}
  </div>
  <div style="font-size:13px;margin-top:6px;color:#8A6A3B;font-weight:bold;">
    ※ ${DEPOSIT_NOTICE}
  </div>

  <!-- 로고 -->
  <div style="text-align:center;margin-top:40px;">
    <img src="${logoBase64}" alt="WHITE PENGUIN" style="height:40px;object-fit:contain;" />
  </div>

</div>
</body>
</html>`
}

// ─── HTML 이스케이프 — 고객 입력값을 메일 HTML 에 넣기 전에 ───
export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 견적서 메일에 넣을 로고 (data URI) */
export function loadQuoteLogo(): string {
  const logoPath = path.join(process.cwd(), 'public', 'logo-quote.png')
  return `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
}

/** 발주서 엑셀 파일명 — 발주서_업체명_YYYYMMDD.xlsx */
export function excelFilenameFor(companyName: string, now = new Date()): string {
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `발주서_${companyName}_${dateStr}.xlsx`
}

// ─── 오너용 새 발주 알림 메일 ─────────────────────────────────
export interface OwnerEmailParams {
  /** 상단 제목 */
  headline: string
  companyName: string
  representative: string
  phone: string
  email: string
  address: string
  businessNumber?: string | null
  notes?: string | null
  cart: { product: { name: string; size?: string; priceVatIncluded: number }; quantity: number }[]
  /** 합계 줄 앞에 넣을 추가 행 (쿠폰 할인 등, 이미 이스케이프된 HTML) */
  extraFooterRowsHtml?: string
  /** 합계 라벨 뒤에 붙는 설명 (예: ' · 10% 할인 적용') */
  totalSuffix?: string
  finalTotal: number
  excelFilename: string
  hasBizFile?: boolean
}

export function buildOwnerEmail(p: OwnerEmailParams): string {
  const productRows = p.cart.map((item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">
          ${escapeHtml(item.product.name)}${item.product.size ? ` (${escapeHtml(item.product.size)})` : ''}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px;">
          ${Number(item.quantity)}개
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;">
          ${(Number(item.product.priceVatIncluded) * Number(item.quantity)).toLocaleString()}원
        </td>
      </tr>`).join('')

  return `
<div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#333;">
  <div style="background:#333333;color:white;padding:24px;border-radius:10px 10px 0 0;">
    <h1 style="margin:0;font-size:20px;">${escapeHtml(p.headline)}</h1>
    <p style="margin:6px 0 0;font-size:13px;opacity:0.75;">화이트펭귄 발주 시스템</p>
  </div>
  <div style="background:#fafafa;padding:24px;border:1px solid #eee;border-top:none;">
    <h2 style="font-size:14px;color:#666;margin:0 0 10px;">업체 정보</h2>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #eee;">
      <tr><td style="padding:9px 14px;color:#999;font-size:13px;width:110px;">업체명</td><td style="padding:9px 14px;font-weight:700;">${escapeHtml(p.companyName)}</td></tr>
      <tr style="background:#fafafa;"><td style="padding:9px 14px;color:#999;font-size:13px;">담당자명</td><td style="padding:9px 14px;">${escapeHtml(p.representative)}</td></tr>
      <tr><td style="padding:9px 14px;color:#999;font-size:13px;">연락처</td><td style="padding:9px 14px;">${escapeHtml(p.phone)}</td></tr>
      <tr style="background:#fafafa;"><td style="padding:9px 14px;color:#999;font-size:13px;">이메일</td><td style="padding:9px 14px;">${escapeHtml(p.email)}</td></tr>
      <tr><td style="padding:9px 14px;color:#999;font-size:13px;">배송지</td><td style="padding:9px 14px;">${escapeHtml(p.address)}</td></tr>
      ${p.businessNumber ? `<tr style="background:#fafafa;"><td style="padding:9px 14px;color:#999;font-size:13px;">사업자번호</td><td style="padding:9px 14px;">${escapeHtml(p.businessNumber)}</td></tr>` : ''}
      ${p.notes ? `<tr><td style="padding:9px 14px;color:#999;font-size:13px;">요청사항</td><td style="padding:9px 14px;">${escapeHtml(p.notes)}</td></tr>` : ''}
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
        ${p.extraFooterRowsHtml ?? ''}
        <tr style="background:#f9f4ee;">
          <td colspan="2" style="padding:12px 14px;font-weight:700;font-size:15px;">
            합계 (VAT 포함)${escapeHtml(p.totalSuffix ?? '')}
          </td>
          <td style="padding:12px 14px;text-align:right;font-weight:900;font-size:17px;color:#333;">${p.finalTotal.toLocaleString()}원</td>
        </tr>
      </tfoot>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#888;">📎 발주서 엑셀 첨부: ${escapeHtml(p.excelFilename)}</p>
    ${p.hasBizFile ? '<p style="margin:6px 0 0;font-size:13px;color:#888;">📎 사업자등록증 첨부</p>' : ''}
  </div>
  <div style="background:#efefef;padding:14px 24px;border-radius:0 0 10px 10px;font-size:12px;color:#aaa;text-align:center;">
    화이트펭귄 자동 발송 메일 · 이 메일에 직접 회신하지 마세요
  </div>
</div>`
}
