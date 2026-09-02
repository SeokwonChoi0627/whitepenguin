// 반품요청 메일 본문 생성 — 관리자용 / 고객 확인용

import {
  RETURN_REASON_MAP,
  productLabel,
  type ReturnItem,
  type ReturnReason,
} from '@/lib/returns'

export interface ReturnMailData {
  returnNumber: string
  orderNumber: string
  companyName: string
  representative: string
  phone: string
  email: string
  reason: ReturnReason
  reasonDetail: string
  items: ReturnItem[]
  refundBank: string
  refundAccount: string
  refundHolder: string
  pickupAddress: string
  photos: string[]
  createdAt: Date
}

/** HTML 삽입 전 이스케이프 — 사용자가 입력한 값은 모두 이 함수를 거친다 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 메일에 넣어도 안전한 http(s) URL 만 통과시킨다 */
function safeUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function itemRows(items: ReturnItem[]): string {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">
          ${escapeHtml(productLabel(item.name, item.size))}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px;">
          ${item.quantity}개
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px;color:#999;">
          발주 ${item.orderedQuantity}개
        </td>
      </tr>`
    )
    .join('')
}

function row(label: string, value: string, striped = false): string {
  return `<tr${striped ? ' style="background:#fafafa;"' : ''}>
    <td style="padding:9px 14px;color:#999;font-size:13px;width:110px;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:9px 14px;">${value}</td>
  </tr>`
}

function photoBlock(photos: string[]): string {
  const urls = photos.map(safeUrl).filter((u): u is string => u !== null)
  if (urls.length === 0) return ''

  const thumbs = urls
    .map(
      (url) => `
      <a href="${url}" style="display:inline-block;margin:0 8px 8px 0;">
        <img src="${url}" alt="증빙 사진" width="120"
             style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #eee;" />
      </a>`
    )
    .join('')

  return `
    <h2 style="font-size:14px;color:#666;margin:24px 0 10px;">증빙 사진 (${urls.length}장)</h2>
    <div>${thumbs}</div>`
}

/** 관리자에게 보내는 반품요청 알림 — 환급계좌 전문 포함 */
export function buildAdminReturnEmail(d: ReturnMailData): string {
  const reason = RETURN_REASON_MAP[d.reason]
  const shippingNote = reason.customerPaysShipping
    ? '<span style="color:#c0392b;font-weight:700;">고객 부담</span> (단순 변심)'
    : '<span style="color:#1e7e34;font-weight:700;">판매자 부담</span>'

  return `
<div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#333;">
  <div style="background:#333333;color:white;padding:24px;border-radius:10px 10px 0 0;">
    <h1 style="margin:0;font-size:20px;">↩️ 반품요청이 접수되었습니다</h1>
    <p style="margin:6px 0 0;font-size:13px;opacity:0.75;">
      반품번호 ${escapeHtml(d.returnNumber)} · ${formatDateTime(d.createdAt)}
    </p>
  </div>
  <div style="background:#fafafa;padding:24px;border:1px solid #eee;border-top:none;">

    <h2 style="font-size:14px;color:#666;margin:0 0 10px;">신청자 정보</h2>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #eee;">
      ${row('원 주문번호', `<strong style="font-family:monospace;">${escapeHtml(d.orderNumber)}</strong>`)}
      ${row('업체명', `<strong>${escapeHtml(d.companyName)}</strong>`, true)}
      ${row('담당자명', escapeHtml(d.representative))}
      ${row('연락처', escapeHtml(d.phone), true)}
      ${row('이메일', escapeHtml(d.email))}
      ${row('회수지', escapeHtml(d.pickupAddress), true)}
    </table>

    <h2 style="font-size:14px;color:#666;margin:24px 0 10px;">반품 사유</h2>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #eee;">
      ${row('사유', `<strong>${escapeHtml(reason.label)}</strong>`)}
      ${row('배송비', shippingNote, true)}
      ${d.reasonDetail ? row('상세', escapeHtml(d.reasonDetail).replace(/\n/g, '<br />')) : ''}
    </table>

    <h2 style="font-size:14px;color:#666;margin:24px 0 10px;">반품 품목</h2>
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #eee;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#666;">상품명</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;color:#666;width:80px;">반품 수량</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;color:#666;width:90px;">원 발주</th>
        </tr>
      </thead>
      <tbody>${itemRows(d.items)}</tbody>
    </table>

    <h2 style="font-size:14px;color:#666;margin:24px 0 10px;">환급 계좌</h2>
    <table style="width:100%;border-collapse:collapse;background:#FFF8E7;border-radius:8px;overflow:hidden;border:1px solid #E8D9B5;">
      ${row('은행', `<strong>${escapeHtml(d.refundBank)}</strong>`)}
      ${row('계좌번호', `<strong style="font-family:monospace;font-size:16px;letter-spacing:0.5px;">${escapeHtml(d.refundAccount)}</strong>`)}
      ${row('예금주', `<strong>${escapeHtml(d.refundHolder)}</strong>`)}
    </table>

    ${photoBlock(d.photos)}
  </div>
  <div style="background:#efefef;padding:14px 24px;border-radius:0 0 10px 10px;font-size:12px;color:#aaa;text-align:center;">
    화이트펭귄 자동 발송 메일 · 관리자 &gt; 반품요청 관리에서 상태를 변경할 수 있습니다
  </div>
</div>`
}

/** 고객에게 보내는 접수 확인 메일 — 계좌번호는 마스킹하지 않고 확인용으로 전문 표기 */
export function buildCustomerReturnEmail(d: ReturnMailData): string {
  const reason = RETURN_REASON_MAP[d.reason]
  const itemList = d.items
    .map((i) => `<li style="margin-bottom:4px;">${escapeHtml(productLabel(i.name, i.size))} — ${i.quantity}개</li>`)
    .join('')

  const shippingNotice = reason.customerPaysShipping
    ? `<p style="margin:0;font-size:13px;color:#8A6A3B;line-height:1.7;">
         단순 변심 반품은 왕복 배송비가 고객님 부담이며, 환급액에서 차감 후 입금됩니다.
       </p>`
    : `<p style="margin:0;font-size:13px;color:#8A6A3B;line-height:1.7;">
         상품 하자·오배송으로 접수되어 배송비는 화이트펭귄이 부담합니다.
         확인 과정에서 사유가 달라질 경우 담당자가 연락드립니다.
       </p>`

  return `
<div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#333;">
  <div style="background:#333333;color:white;padding:24px;border-radius:10px 10px 0 0;">
    <h1 style="margin:0;font-size:20px;">반품요청이 정상 접수되었습니다</h1>
    <p style="margin:6px 0 0;font-size:13px;opacity:0.75;">반품번호 ${escapeHtml(d.returnNumber)}</p>
  </div>
  <div style="background:#fafafa;padding:24px;border:1px solid #eee;border-top:none;">
    <p style="font-size:14px;line-height:1.8;margin:0 0 20px;">
      ${escapeHtml(d.representative || d.companyName)}님, 반품요청을 접수했습니다.<br />
      담당자가 확인 후 <strong>영업일 기준 1~2일 이내</strong>에 회수 일정을 안내드리며,
      상품 회수·검수가 끝나면 아래 계좌로 환급해 드립니다.
    </p>

    <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #eee;">
      ${row('원 주문번호', `<span style="font-family:monospace;">${escapeHtml(d.orderNumber)}</span>`)}
      ${row('반품 사유', escapeHtml(reason.label), true)}
      ${row('반품 품목', `<ul style="margin:0;padding-left:18px;font-size:14px;">${itemList}</ul>`)}
      ${row('회수지', escapeHtml(d.pickupAddress), true)}
      ${row('환급 계좌', `${escapeHtml(d.refundBank)} ${escapeHtml(d.refundAccount)} (${escapeHtml(d.refundHolder)})`)}
    </table>

    <div style="background:#F7F3EE;border-radius:8px;padding:14px 16px;margin-top:16px;">
      ${shippingNotice}
    </div>

    <p style="font-size:13px;color:#888;margin:20px 0 0;line-height:1.7;">
      입력하신 계좌 정보가 틀린 경우 환급이 지연될 수 있습니다.
      정정이 필요하시면 <strong>050-6814-0627</strong> 로 연락 주세요.
    </p>
  </div>
  <div style="background:#efefef;padding:14px 24px;border-radius:0 0 10px 10px;font-size:12px;color:#aaa;text-align:center;">
    화이트펭귄 자동 발송 메일 · 이 메일에 직접 회신하지 마세요
  </div>
</div>`
}
