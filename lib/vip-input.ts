import 'server-only'

// VIP 링크 관리자 API 공용 — 권한 확인과 요청 본문 정규화

import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { isAdminEmail } from '@/lib/admin'
import { PRODUCTS } from '@/lib/products'
import { cleanText, type VipLinkInput } from '@/lib/vip'

export const KNOWN_PRODUCT_IDS = new Set(PRODUCTS.map((p) => p.id))

export async function requireAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions)
  const user = session?.user as { email?: string } | undefined
  return isAdminEmail(user?.email)
}

function parseOverrides(v: unknown): Record<string, number> | null {
  if (v === undefined || v === null) return {}
  if (typeof v !== 'object' || Array.isArray(v)) return null
  const out: Record<string, number> = {}
  for (const [id, raw] of Object.entries(v as Record<string, unknown>)) {
    if (raw === null || raw === '') continue // 빈칸 = 개별가 없음
    const n = Number(raw)
    if (!Number.isFinite(n)) return null
    out[id] = Math.trunc(n)
  }
  return out
}

function parseProductIds(v: unknown): string[] | null | undefined {
  if (v === null) return null
  if (!Array.isArray(v) || v.some((id) => typeof id !== 'string')) return undefined
  return Array.from(new Set(v as string[]))
}

/**
 * 요청 본문을 VIP 링크 입력으로 정규화한다. 형식이 어긋나면 null.
 * base 를 주면 본문에 없는 필드는 base 값을 쓴다 (PATCH 용).
 */
export function parseVipLinkInput(body: unknown, base?: VipLinkInput): VipLinkInput | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  const has = (k: string) => k in b
  const text = (k: keyof VipLinkInput) => (has(k) ? cleanText(b[k]) : base ? (base[k] as string | null) : null)

  const overrides = has('price_overrides') ? parseOverrides(b.price_overrides) : base?.price_overrides ?? {}
  if (overrides === null) return null

  const productIds = has('product_ids') ? parseProductIds(b.product_ids) : base ? base.product_ids : null
  if (productIds === undefined) return null

  const rawDiscount = b.discount_percent
  const discount = !has('discount_percent')
    ? base?.discount_percent ?? 0
    : typeof rawDiscount === 'number' || (typeof rawDiscount === 'string' && rawDiscount.trim() !== '')
      ? Number(rawDiscount)
      : NaN
  if (has('is_active') && typeof b.is_active !== 'boolean') return null

  return {
    label: text('label') ?? '',
    discount_percent: Number.isFinite(discount) ? discount : NaN,
    price_overrides: overrides,
    product_ids: productIds,
    company_name: text('company_name'),
    representative: text('representative'),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    business_number: text('business_number'),
    is_active: has('is_active') ? (b.is_active as boolean) : base?.is_active ?? true,
    expires_at: text('expires_at'),
  }
}

/**
 * 상품총괄표에서 빠진 상품 id 를 걷어낸다.
 * 저장된 링크에 사라진 상품이 남아 있으면 검증에 걸려 중지·주소 재발급조차 못 하게 되기 때문.
 */
export function pruneUnknownProducts(input: VipLinkInput): VipLinkInput {
  return {
    ...input,
    product_ids: input.product_ids?.filter((id) => KNOWN_PRODUCT_IDS.has(id)) ?? null,
    price_overrides: Object.fromEntries(
      Object.entries(input.price_overrides).filter(([id]) => KNOWN_PRODUCT_IDS.has(id))
    ),
  }
}

/** DB 행에서 입력 필드만 뽑는다 */
export function toVipLinkInput(link: VipLinkInput): VipLinkInput {
  return pruneUnknownProducts({
    label: link.label,
    discount_percent: link.discount_percent,
    price_overrides: link.price_overrides,
    product_ids: link.product_ids,
    company_name: link.company_name,
    representative: link.representative,
    phone: link.phone,
    email: link.email,
    address: link.address,
    business_number: link.business_number,
    is_active: link.is_active,
    expires_at: link.expires_at,
  })
}
