// VIP 시크릿 발주 — 가격 계산·입력 검증 (클라이언트/서버 공용, DB 접근 없음)
//
// 가격은 항상 서버가 이 파일의 함수로 다시 계산한다. 화면이 보낸 단가는 쓰지 않는다.

import type { CategoryKey, Product } from '@/lib/types'

export interface VipContact {
  company_name: string | null
  representative: string | null
  phone: string | null
  email: string | null
  address: string | null
  business_number: string | null
}

export interface VipLinkInput extends VipContact {
  label: string
  discount_percent: number
  /** 상품 id → VIP 단가 (할인율보다 우선) */
  price_overrides: Record<string, number>
  /** null = 전체 상품 */
  product_ids: string[] | null
  is_active: boolean
  expires_at: string | null
}

export interface VipLink extends VipLinkInput {
  id: string
  token: string
  last_ordered_at: string | null
  created_at: string
  updated_at: string
}

export interface VipCatalogItem {
  id: string
  name: string
  size?: string
  category: CategoryKey
  image?: string
  regularPrice: number
  vipPrice: number
  soldOut: boolean
}

export interface VipOrderLine {
  product: { id: string; name: string; size?: string; category: CategoryKey; priceVatIncluded: number }
  quantity: number
}

export const MAX_DISCOUNT_PERCENT = 90
export const MAX_QUANTITY_PER_ITEM = 9999
export const MAX_UNIT_PRICE = 10_000_000
const LABEL_MAX = 60
const CONTACT_MAX = 200

/** 링크 토큰 형식 — DB 조회 전에 걸러서 쓸데없는 질의를 막는다 */
export const VIP_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * VIP 단가. 개별 지정가가 있으면 그 값, 없으면 할인율을 적용해 10원 미만을 버린다.
 */
export function vipUnitPrice(
  product: Pick<Product, 'id' | 'priceVatIncluded'>,
  link: Pick<VipLinkInput, 'discount_percent' | 'price_overrides'>
): number {
  const override = link.price_overrides[product.id]
  if (typeof override === 'number' && override > 0) return override
  // 부동소수 오차(1000 * 0.93 = 929.999…)로 10원이 깎이지 않도록 정수로만 계산한다
  return Math.floor((product.priceVatIncluded * (100 - link.discount_percent)) / 1000) * 10
}

export function isVipLinkUsable(link: Pick<VipLink, 'is_active' | 'expires_at'>, now = new Date()): boolean {
  if (!link.is_active) return false
  if (link.expires_at && new Date(link.expires_at) <= now) return false
  return true
}

/** 링크에서 보여줄 상품 목록 (원래 상품 순서 유지) */
export function buildVipCatalog(
  products: Product[],
  link: Pick<VipLinkInput, 'discount_percent' | 'price_overrides' | 'product_ids'>,
  soldOut: Record<string, boolean>
): VipCatalogItem[] {
  const allowed = link.product_ids ? new Set(link.product_ids) : null
  return products
    .filter((p) => !allowed || allowed.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      size: p.size,
      category: p.category,
      image: p.image,
      regularPrice: p.priceVatIncluded,
      vipPrice: vipUnitPrice(p, link),
      soldOut: soldOut[p.id] === true,
    }))
}

export type PriceVipOrderResult =
  | { ok: true; lines: VipOrderLine[]; total: number; totalQuantity: number }
  | { ok: false; error: string }

/**
 * 고객이 보낸 {상품id, 수량} 목록을 검증하고 서버 기준 가격으로 계산한다.
 * 같은 상품이 여러 번 오면 수량을 합친다.
 */
export function priceVipOrder(
  rawItems: unknown,
  catalog: VipCatalogItem[]
): PriceVipOrderResult {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, error: '발주할 상품을 1개 이상 선택해 주세요.' }
  }
  if (rawItems.length > catalog.length + 10) {
    return { ok: false, error: '요청 형식이 올바르지 않습니다.' }
  }

  const byId = new Map(catalog.map((c) => [c.id, c]))
  const quantities = new Map<string, number>()

  for (const raw of rawItems) {
    if (typeof raw !== 'object' || raw === null) return { ok: false, error: '요청 형식이 올바르지 않습니다.' }
    const { productId, quantity } = raw as { productId?: unknown; quantity?: unknown }
    if (typeof productId !== 'string' || !Number.isInteger(quantity) || (quantity as number) < 1) {
      return { ok: false, error: '수량이 올바르지 않습니다.' }
    }
    const item = byId.get(productId)
    if (!item) return { ok: false, error: '주문할 수 없는 상품이 포함되어 있습니다.' }
    if (item.soldOut) return { ok: false, error: `'${item.name}' 상품은 품절입니다.` }

    const next = (quantities.get(productId) ?? 0) + (quantity as number)
    if (next > MAX_QUANTITY_PER_ITEM) {
      return { ok: false, error: `상품당 최대 ${MAX_QUANTITY_PER_ITEM.toLocaleString()}개까지 주문할 수 있습니다.` }
    }
    quantities.set(productId, next)
  }

  const lines: VipOrderLine[] = catalog
    .filter((c) => quantities.has(c.id))
    .map((c) => ({
      product: { id: c.id, name: c.name, size: c.size, category: c.category, priceVatIncluded: c.vipPrice },
      quantity: quantities.get(c.id)!,
    }))

  return {
    ok: true,
    lines,
    total: lines.reduce((sum, l) => sum + l.product.priceVatIncluded * l.quantity, 0),
    totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
  }
}

export type ValidationResult = { ok: true } | { ok: false; error: string }

function tooLong(v: string | null, max = CONTACT_MAX) {
  return v !== null && v.length > max
}

/** 발주 시 고객 연락처 검증 */
export function validateVipContact(c: VipContact): ValidationResult {
  if (!c.company_name) return { ok: false, error: '업체명을 입력해 주세요.' }
  if (!c.representative) return { ok: false, error: '담당자명을 입력해 주세요.' }
  if (!c.phone || c.phone.replace(/\D/g, '').length < 9) return { ok: false, error: '연락처를 확인해 주세요.' }
  if (!c.address) return { ok: false, error: '배송지를 입력해 주세요.' }
  if (c.email && !EMAIL_PATTERN.test(c.email)) return { ok: false, error: '이메일 형식을 확인해 주세요.' }
  const fields = [c.company_name, c.representative, c.phone, c.email, c.address, c.business_number]
  if (fields.some((f) => tooLong(f))) return { ok: false, error: '입력값이 너무 깁니다.' }
  return { ok: true }
}

/** 관리자 링크 생성·수정 입력 검증 */
export function validateVipLinkInput(input: VipLinkInput, knownProductIds: Set<string>): ValidationResult {
  if (!input.label) return { ok: false, error: '고객 이름을 입력해 주세요.' }
  if (input.label.length > LABEL_MAX) return { ok: false, error: `고객 이름은 ${LABEL_MAX}자 이내로 입력해 주세요.` }

  if (!Number.isInteger(input.discount_percent) || input.discount_percent < 0 || input.discount_percent > MAX_DISCOUNT_PERCENT) {
    return { ok: false, error: `할인율은 0~${MAX_DISCOUNT_PERCENT}% 사이로 입력해 주세요.` }
  }

  for (const [id, price] of Object.entries(input.price_overrides)) {
    if (!knownProductIds.has(id)) return { ok: false, error: '존재하지 않는 상품의 가격이 포함되어 있습니다.' }
    if (!Number.isInteger(price) || price < 1 || price > MAX_UNIT_PRICE) {
      return { ok: false, error: '개별 VIP 가격은 1원 이상의 정수로 입력해 주세요.' }
    }
  }

  if (input.product_ids !== null) {
    // 중지된 링크는 상품이 비어도 된다 — 상품이 모두 단종된 링크도 중지할 수 있어야 한다
    if (input.product_ids.length === 0 && input.is_active) {
      return { ok: false, error: '노출할 상품을 1개 이상 선택해 주세요.' }
    }
    if (input.product_ids.some((id) => !knownProductIds.has(id))) {
      return { ok: false, error: '존재하지 않는 상품이 포함되어 있습니다.' }
    }
  }

  if (input.email && !EMAIL_PATTERN.test(input.email)) return { ok: false, error: '이메일 형식을 확인해 주세요.' }
  const fields = [input.company_name, input.representative, input.phone, input.email, input.address, input.business_number]
  if (fields.some((f) => tooLong(f))) return { ok: false, error: '입력값이 너무 깁니다.' }

  if (input.expires_at && Number.isNaN(new Date(input.expires_at).getTime())) {
    return { ok: false, error: '만료일 형식이 올바르지 않습니다.' }
  }
  return { ok: true }
}

/** 문자열 필드 정규화 — 공백만 있으면 null */
export function cleanText(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}
