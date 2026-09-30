'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PRODUCTS } from '@/lib/products'
import { CATEGORIES } from '@/lib/categories'
import { endOfDayIso, toDateString } from '@/lib/kst'
import { MAX_DISCOUNT_PERCENT, vipUnitPrice, type VipLink } from '@/lib/vip'

interface FormState {
  label: string
  discount_percent: string
  expires_at: string
  company_name: string
  representative: string
  phone: string
  email: string
  address: string
  business_number: string
  allProducts: boolean
  selected: Set<string>
  /** 상품 id → 입력 중인 개별가 문자열 */
  overrides: Record<string, string>
}

function toForm(link: VipLink | null): FormState {
  return {
    label: link?.label ?? '',
    discount_percent: String(link?.discount_percent ?? 10),
    expires_at: link?.expires_at ? toDateString(link.expires_at) : '',
    company_name: link?.company_name ?? '',
    representative: link?.representative ?? '',
    phone: link?.phone ?? '',
    email: link?.email ?? '',
    address: link?.address ?? '',
    business_number: link?.business_number ?? '',
    allProducts: !link || link.product_ids === null,
    selected: new Set(link?.product_ids ?? PRODUCTS.map((p) => p.id)),
    overrides: Object.fromEntries(
      Object.entries(link?.price_overrides ?? {}).map(([id, price]) => [id, String(price)])
    ),
  }
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#C4A882] focus:ring-2 focus:ring-[#C4A882]/20'

interface Props {
  link: VipLink | null
  onSaved: () => void
  onCancel: () => void
}

export default function VipLinkForm({ link, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(link))
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const discount = Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, Number(form.discount_percent) || 0))

  const overridesForPreview = useMemo(() => {
    const out: Record<string, number> = {}
    for (const [id, v] of Object.entries(form.overrides)) {
      const n = parseInt(v, 10)
      if (n > 0) out[id] = n
    }
    return out
  }, [form.overrides])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATEGORIES.map((cat) => ({
      cat,
      items: PRODUCTS.filter(
        (p) => p.category === cat.key && (!q || `${p.name} ${p.size ?? ''}`.toLowerCase().includes(q))
      ),
    })).filter((g) => g.items.length > 0)
  }, [query])

  const toggleProduct = (id: string, on: boolean) => {
    const next = new Set(form.selected)
    if (on) next.add(id)
    else next.delete(id)
    setForm({ ...form, selected: next })
  }

  const toggleGroup = (ids: string[], on: boolean) => {
    const next = new Set(form.selected)
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
    setForm({ ...form, selected: next })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = {
        label: form.label,
        discount_percent: Number(form.discount_percent),
        expires_at: form.expires_at ? endOfDayIso(form.expires_at) : null,
        company_name: form.company_name,
        representative: form.representative,
        phone: form.phone,
        email: form.email,
        address: form.address,
        business_number: form.business_number,
        product_ids: form.allProducts ? null : Array.from(form.selected),
        price_overrides: form.overrides,
      }
      const res = await fetch(link ? `/api/vip-links/${link.id}` : '/api/vip-links', {
        method: link ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장에 실패했습니다.')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const text = (key: keyof FormState, label: string, placeholder?: string) => (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <input
        type="text"
        value={form[key] as string}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={`mt-1 ${inputClass}`}
      />
    </label>
  )

  return (
    <form onSubmit={save} className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
      <h2 className="font-bold text-[#333333]">{link ? 'VIP 링크 수정' : '새 VIP 링크 발급'}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-1">
          <span className="text-xs font-medium text-gray-500">고객 이름 (관리용) *</span>
          <input
            type="text" required value={form.label} maxLength={60}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="예: 강남 OO베이커리"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500">기본 할인율 (%) *</span>
          <input
            type="number" required min={0} max={MAX_DISCOUNT_PERCENT} value={form.discount_percent}
            onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-500">링크 만료일</span>
          <input
            type="date" value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            className={`mt-1 ${inputClass}`}
          />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[#333333]">고객 정보 기본값</legend>
        <p className="text-xs text-gray-400 -mt-1">발주 화면에 미리 채워집니다. 고객이 발주할 때 수정할 수 있습니다.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {text('company_name', '업체명')}
          {text('representative', '담당자명')}
          {text('phone', '연락처', '010-0000-0000')}
          {text('email', '이메일')}
          {text('business_number', '사업자번호')}
        </div>
        {text('address', '배송지')}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[#333333]">노출 상품 · VIP 가격</legend>
        <label className="flex items-start gap-2.5 bg-[#F7F3EE] rounded-xl px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.allProducts}
            onChange={(e) => setForm({ ...form, allProducts: e.target.checked })}
            className="mt-0.5 accent-[#333333]"
          />
          <span>
            <span className="block text-sm font-semibold text-gray-900">전체 상품 노출</span>
            <span className="block text-xs text-gray-500 mt-0.5">
              새로 등록되는 상품도 자동으로 포함됩니다. 끄면 체크한 상품만 보입니다.
            </span>
          </span>
        </label>

        <p className="text-xs text-gray-400">
          VIP가는 정가에서 {discount}% 할인 후 10원 미만을 버린 금액입니다. 특정 상품만 다른 가격을 쓰려면 &lsquo;개별가&rsquo;에 입력하세요.
        </p>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="상품 검색" className={`${inputClass} pl-9`}
          />
        </div>

        <div className="max-h-[480px] overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-100">
          {groups.map(({ cat, items }) => {
            const ids = items.map((p) => p.id)
            const allOn = ids.every((id) => form.selected.has(id))
            return (
              <div key={cat.key}>
                <div className="sticky top-0 z-[1] flex items-center gap-2 px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500">
                  {!form.allProducts && (
                    <input
                      type="checkbox" checked={allOn} aria-label={`${cat.label} 전체 선택`}
                      onChange={(e) => toggleGroup(ids, e.target.checked)}
                      className="accent-[#333333]"
                    />
                  )}
                  {cat.emoji} {cat.label}
                </div>
                {items.map((p) => {
                  const shown = form.allProducts || form.selected.has(p.id)
                  const vip = vipUnitPrice(p, { discount_percent: discount, price_overrides: overridesForPreview })
                  return (
                    <div key={p.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${shown ? '' : 'opacity-40'}`}>
                      {!form.allProducts && (
                        <input
                          type="checkbox" checked={form.selected.has(p.id)} aria-label={`${p.name} 노출`}
                          onChange={(e) => toggleProduct(p.id, e.target.checked)}
                          className="accent-[#333333]"
                        />
                      )}
                      <span className="flex-1 min-w-0 truncate text-[#333333]">
                        {p.name}{p.size && <span className="text-gray-400"> · {p.size}</span>}
                      </span>
                      <span className="w-16 text-right text-xs text-gray-400 line-through tabular-nums">
                        {p.priceVatIncluded.toLocaleString()}
                      </span>
                      <span className="w-16 text-right font-semibold tabular-nums text-[#333333]">
                        {vip.toLocaleString()}
                      </span>
                      <input
                        type="text" inputMode="numeric" aria-label={`${p.name} 개별가`}
                        value={form.overrides[p.id] ?? ''} placeholder="개별가"
                        onChange={(e) =>
                          setForm({
                            ...form,
                            overrides: { ...form.overrides, [p.id]: e.target.value.replace(/[^0-9]/g, '') },
                          })
                        }
                        className="w-20 rounded-md border border-gray-200 px-2 py-1 text-right text-xs tabular-nums focus:outline-none focus:border-[#C4A882]"
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </fieldset>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">
          취소
        </button>
        <button
          type="submit" disabled={saving}
          className="px-5 py-2 rounded-lg bg-[#333333] text-white text-sm font-semibold hover:bg-[#1a1a1a] disabled:bg-gray-300"
        >
          {saving ? '저장 중…' : link ? '저장' : '링크 발급'}
        </button>
      </div>
    </form>
  )
}
