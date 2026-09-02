// 반품요청 도메인 — 클라이언트/서버 양쪽에서 공유하는 상수·타입·검증 로직

export type ReturnReason =
  | 'change_of_mind'
  | 'defective'
  | 'wrong_item'
  | 'different'
  | 'other'

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'collecting'
  | 'completed'
  | 'rejected'

export interface ReturnReasonOption {
  value: ReturnReason
  label: string
  /** 왕복 배송비를 고객이 부담하는 사유인지 (전자상거래법상 단순변심 기준) */
  customerPaysShipping: boolean
  /** 증빙 사진을 권장하는 사유인지 */
  requiresPhoto: boolean
  hint: string
}

export const RETURN_REASONS: readonly ReturnReasonOption[] = [
  {
    value: 'change_of_mind',
    label: '단순 변심',
    customerPaysShipping: true,
    requiresPhoto: false,
    hint: '왕복 배송비는 고객님 부담이며, 환급액에서 차감됩니다.',
  },
  {
    value: 'defective',
    label: '파손 · 불량',
    customerPaysShipping: false,
    requiresPhoto: true,
    hint: '배송비는 화이트펭귄이 부담합니다. 파손 부위 사진을 첨부해 주세요.',
  },
  {
    value: 'wrong_item',
    label: '오배송 (다른 상품이 옴)',
    customerPaysShipping: false,
    requiresPhoto: true,
    hint: '배송비는 화이트펭귄이 부담합니다. 받으신 상품 사진을 첨부해 주세요.',
  },
  {
    value: 'different',
    label: '상품 설명과 다름',
    customerPaysShipping: false,
    requiresPhoto: true,
    hint: '배송비는 화이트펭귄이 부담합니다. 확인 가능한 사진을 첨부해 주세요.',
  },
  {
    value: 'other',
    label: '기타',
    customerPaysShipping: false,
    requiresPhoto: false,
    hint: '상세 사유를 구체적으로 적어주시면 처리가 빨라집니다.',
  },
] as const

export const RETURN_REASON_MAP = Object.fromEntries(
  RETURN_REASONS.map((r) => [r.value, r])
) as Record<ReturnReason, ReturnReasonOption>

export interface ReturnStatusOption {
  value: ReturnStatus
  label: string
  /** Tailwind 배지 클래스 */
  badgeClass: string
}

export const RETURN_STATUSES: readonly ReturnStatusOption[] = [
  { value: 'requested', label: '접수', badgeClass: 'bg-[#EDE4D8] text-[#8A6A3B]' },
  { value: 'approved', label: '승인', badgeClass: 'bg-blue-50 text-blue-600' },
  { value: 'collecting', label: '회수중', badgeClass: 'bg-amber-50 text-amber-700' },
  { value: 'completed', label: '환불완료', badgeClass: 'bg-emerald-50 text-emerald-700' },
  { value: 'rejected', label: '반려', badgeClass: 'bg-red-50 text-red-600' },
] as const

export const RETURN_STATUS_MAP = Object.fromEntries(
  RETURN_STATUSES.map((s) => [s.value, s])
) as Record<ReturnStatus, ReturnStatusOption>

export const BANKS = [
  '국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행',
  'SC제일은행', '씨티은행', '카카오뱅크', '케이뱅크', '토스뱅크',
  '새마을금고', '신협', '우체국', '수협은행', '대구은행', '부산은행',
  '경남은행', '광주은행', '전북은행', '제주은행', '산업은행',
] as const

/** 증빙 사진을 올리는 스토리지 버킷 (기존 커뮤니티 이미지 버킷 재사용) */
export const RETURN_PHOTO_BUCKET = 'community-images'

export const MAX_RETURN_PHOTOS = 4
export const MAX_REASON_DETAIL_LENGTH = 1000
const MIN_ACCOUNT_DIGITS = 10
const MAX_ACCOUNT_DIGITS = 16
const MAX_HOLDER_LENGTH = 40
const MAX_PRODUCT_FIELD_LENGTH = 200
const MAX_ADDRESS_LENGTH = 300

export interface ReturnItemInput {
  name: string
  size?: string
  quantity: number
}

export interface ReturnItem extends ReturnItemInput {
  /** 원 발주 수량 — 신청 시점 스냅샷 */
  orderedQuantity: number
}

export interface ReturnRequestInput {
  orderNumber: string
  reason: ReturnReason
  reasonDetail: string
  items: ReturnItemInput[]
  refundBank: string
  refundAccount: string
  refundHolder: string
  pickupAddress: string
  pickupAddressDetail: string
  photos: string[]
}

export interface ReturnRequestRecord {
  id: string
  return_number: string
  order_number: string
  quote_id: string | null
  user_id: string
  company_name: string | null
  representative: string | null
  phone: string | null
  email: string | null
  reason: ReturnReason
  reason_detail: string | null
  items: ReturnItem[]
  refund_bank: string
  refund_account: string
  refund_holder: string
  pickup_address: string
  pickup_address_detail: string | null
  photos: string[]
  status: ReturnStatus
  admin_note: string | null
  created_at: string
  updated_at: string
}

/** 상품 식별 키 — 발주 품목과 반품 품목을 대조할 때 사용 */
export function itemKey(name: string, size?: string): string {
  return `${name}__${size ?? ''}`
}

export function productLabel(name: string, size?: string): string {
  return size ? `${name} (${size})` : name
}

/** 계좌번호 정규화 — 숫자만 남긴다 */
export function normalizeAccountNumber(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** 관리자 목록에서 계좌번호를 가릴 때 사용 (뒤 4자리만 노출) */
export function maskAccountNumber(account: string): string {
  const digits = normalizeAccountNumber(account)
  if (digits.length <= 4) return '*'.repeat(digits.length)
  return '*'.repeat(digits.length - 4) + digits.slice(-4)
}

export function generateReturnNumber(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `R${yy}${mm}${dd}${rand}`
}

export interface ValidationResult {
  ok: boolean
  error?: string
}

/**
 * 반품요청 입력값 검증.
 * 클라이언트에서는 즉시 피드백용으로, 서버에서는 최종 방어선으로 동일하게 호출한다.
 *
 * @param orderedItems 원 발주 품목. 넘기면 "주문에 없는 상품"과 "수량 초과"까지 검사한다.
 */
export function validateReturnRequest(
  input: ReturnRequestInput,
  orderedItems?: ReturnItem[]
): ValidationResult {
  const basics = validateReasonAndItems(input, orderedItems)
  if (!basics.ok) return basics

  const account = validateRefundAccount(input)
  if (!account.ok) return account

  if (!input.pickupAddress?.trim()) {
    return { ok: false, error: '회수지 주소를 입력해 주세요.' }
  }
  if (
    input.pickupAddress.length > MAX_ADDRESS_LENGTH ||
    input.pickupAddressDetail.length > MAX_ADDRESS_LENGTH
  ) {
    return { ok: false, error: `주소는 ${MAX_ADDRESS_LENGTH}자 이내로 입력해 주세요.` }
  }
  if (input.photos.length > MAX_RETURN_PHOTOS) {
    return { ok: false, error: `사진은 최대 ${MAX_RETURN_PHOTOS}장까지 첨부할 수 있습니다.` }
  }
  return { ok: true }
}

function validateReasonAndItems(
  input: ReturnRequestInput,
  orderedItems?: ReturnItem[]
): ValidationResult {
  if (!input.orderNumber?.trim()) {
    return { ok: false, error: '주문번호가 없습니다.' }
  }
  if (!RETURN_REASON_MAP[input.reason]) {
    return { ok: false, error: '반품 사유를 선택해 주세요.' }
  }
  if (input.reason === 'other' && !input.reasonDetail.trim()) {
    return { ok: false, error: '기타 사유를 선택하신 경우 상세 사유를 입력해 주세요.' }
  }
  if (input.reasonDetail.length > MAX_REASON_DETAIL_LENGTH) {
    return { ok: false, error: `상세 사유는 ${MAX_REASON_DETAIL_LENGTH}자 이내로 입력해 주세요.` }
  }

  const items = input.items.filter((i) => i.quantity > 0)
  if (items.length === 0) {
    return { ok: false, error: '반품할 상품을 1개 이상 선택해 주세요.' }
  }
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return { ok: false, error: `${productLabel(item.name, item.size)} 의 수량이 올바르지 않습니다.` }
    }
    if (
      item.name.length > MAX_PRODUCT_FIELD_LENGTH ||
      (item.size?.length ?? 0) > MAX_PRODUCT_FIELD_LENGTH
    ) {
      return { ok: false, error: '상품 정보가 올바르지 않습니다.' }
    }
  }

  if (!orderedItems) return { ok: true }

  const orderedMap = new Map(orderedItems.map((o) => [itemKey(o.name, o.size), o.orderedQuantity]))
  for (const item of items) {
    const ordered = orderedMap.get(itemKey(item.name, item.size))
    if (ordered === undefined) {
      return { ok: false, error: `${productLabel(item.name, item.size)} 은(는) 해당 주문에 없는 상품입니다.` }
    }
    if (item.quantity > ordered) {
      return {
        ok: false,
        error: `${productLabel(item.name, item.size)} 은(는) 발주 수량(${ordered}개)을 초과할 수 없습니다.`,
      }
    }
  }
  return { ok: true }
}

function validateRefundAccount(input: ReturnRequestInput): ValidationResult {
  if (!input.refundBank?.trim()) {
    return { ok: false, error: '환급받으실 은행을 선택해 주세요.' }
  }
  if (!(BANKS as readonly string[]).includes(input.refundBank)) {
    return { ok: false, error: '지원하지 않는 은행입니다.' }
  }

  const account = normalizeAccountNumber(input.refundAccount)
  if (account.length < MIN_ACCOUNT_DIGITS || account.length > MAX_ACCOUNT_DIGITS) {
    return {
      ok: false,
      error: `계좌번호를 정확히 입력해 주세요. (숫자 ${MIN_ACCOUNT_DIGITS}~${MAX_ACCOUNT_DIGITS}자리)`,
    }
  }
  if (!input.refundHolder?.trim()) {
    return { ok: false, error: '예금주명을 입력해 주세요.' }
  }
  if (input.refundHolder.trim().length > MAX_HOLDER_LENGTH) {
    return { ok: false, error: '예금주명이 너무 깁니다.' }
  }
  return { ok: true }
}
