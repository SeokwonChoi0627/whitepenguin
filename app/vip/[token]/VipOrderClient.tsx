'use client'

import { useMemo, useState } from 'react'
import { CheckCircle, Search, Sparkles } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import type { VipCatalogItem, VipContact } from '@/lib/vip'
import VipProductRow from './VipProductRow'
import VipOrderForm, { type VipFormState } from './VipOrderForm'
import DepositGuide from '@/components/DepositGuide'
import { DEPOSIT_NOTICE_SHORT } from '@/lib/payment'

interface Props {
  token: string
  catalog: VipCatalogItem[]
  contact: VipContact
}

type Quantities = Record<string, number>

const SELECTED_FILTER = 'selected'

function initialForm(c: VipContact): VipFormState {
  return {
    companyName: c.company_name ?? '',
    representative: c.representative ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    address: c.address ?? '',
    businessNumber: c.business_number ?? '',
    notes: '',
  }
}

export default function VipOrderClient({ token, catalog, contact }: Props) {
  const [quantities, setQuantities] = useState<Quantities>({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [form, setForm] = useState<VipFormState>(() => initialForm(contact))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ orderNumber: string; total: number } | null>(null)

  const setQuantity = (id: string, quantity: number) =>
    setQuantities((prev) => {
      const { [id]: _removed, ...rest } = prev
      return quantity > 0 ? { ...rest, [id]: quantity } : rest
    })

  const summary = useMemo(() => {
    const picked = catalog.filter((c) => (quantities[c.id] ?? 0) > 0)
    return {
      itemCount: picked.length,
      totalQuantity: picked.reduce((s, c) => s + quantities[c.id], 0),
      total: picked.reduce((s, c) => s + c.vipPrice * quantities[c.id], 0),
    }
  }, [catalog, quantities])

  const categories = useMemo(
    () => CATEGORIES.filter((cat) => catalog.some((c) => c.category === cat.key)),
    [catalog]
  )

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (c: VipCatalogItem) =>
      (!q || `${c.name} ${c.size ?? ''}`.toLowerCase().includes(q)) &&
      (filter === 'all' ||
        (filter === SELECTED_FILTER ? (quantities[c.id] ?? 0) > 0 : c.category === filter))
    return categories
      .map((cat) => ({ cat, items: catalog.filter((c) => c.category === cat.key && matches(c)) }))
      .filter((g) => g.items.length > 0)
  }, [catalog, categories, query, filter, quantities])

  const submit = async () => {
    if (summary.itemCount === 0 || submitting) return
    const confirmed = confirm(
      `총 ${summary.totalQuantity.toLocaleString()}개, ${summary.total.toLocaleString()}원을 발주할까요?

${DEPOSIT_NOTICE_SHORT}
발주 후 입금 계좌를 안내드립니다.`
    )
    if (!confirmed) return

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/vip/${encodeURIComponent(token)}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: Object.entries(quantities).map(([productId, quantity]) => ({ productId, quantity })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '발주에 실패했습니다.')
      setDone({ orderNumber: data.orderNumber, total: data.total })
      setQuantities({})
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : '발주에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-[70vh] bg-[#F7F3EE] flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm px-8 py-10 text-center max-w-sm w-full">
          <CheckCircle size={44} className="mx-auto text-[#C4A882]" />
          <h1 className="text-lg font-bold text-[#333333] mt-4">발주가 접수되었습니다</h1>
          <p className="text-xs text-[#8A6A3B] font-semibold mt-1">{DEPOSIT_NOTICE_SHORT}</p>
          <p className="text-sm text-gray-500 mt-2">
            주문번호 <span className="font-semibold text-[#333333] tabular-nums">{done.orderNumber}</span>
          </p>
          <p className="text-2xl font-bold text-[#333333] tabular-nums mt-3">{done.total.toLocaleString()}원</p>
          <div className="mt-5 text-left">
            <DepositGuide amount={done.total} />
          </div>
          {form.email && (
            <p className="text-xs text-gray-400 mt-3">{form.email} 로 견적서를 보냈습니다.</p>
          )}
          <button
            type="button"
            onClick={() => setDone(null)}
            className="mt-6 w-full rounded-xl border border-[#333333] text-[#333333] font-semibold py-3 hover:bg-[#333333] hover:text-white transition"
          >
            추가 발주하기
          </button>
        </div>
      </div>
    )
  }

  const chip = (value: string, text: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition ${
        filter === value
          ? 'bg-[#333333] text-white border-[#333333]'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
      }`}
    >
      {text}
    </button>
  )

  return (
    <div className="min-h-screen bg-[#F7F3EE] pb-28 lg:pb-12">
      {/* ── 헤더 ── */}
      <div className="bg-[#2B2926] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#D9C3A0]">
            <Sparkles size={12} /> VIP PRIVATE ORDER
          </p>
          <h1 className="text-xl sm:text-2xl font-bold mt-2">
            {contact.company_name ? `${contact.company_name} 전용 발주` : 'VIP 전용 발주'}
          </h1>
          <p className="text-sm text-white/60 mt-1">
            VIP 특가가 적용된 전용 가격입니다. 수량만 입력하고 바로 발주하세요.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">
        {/* ── 상품 목록 ── */}
        <section aria-label="상품 목록">
          <div className="sticky top-0 z-10 -mx-4 sm:mx-0 px-4 sm:px-0 pt-1 pb-3 bg-[#F7F3EE]">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="상품명·사이즈 검색"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#C4A882]"
              />
            </div>
            <div className="flex gap-1.5 mt-2 overflow-x-auto [scrollbar-width:none]">
              {chip('all', '전체')}
              {chip(SELECTED_FILTER, `담은 상품 ${summary.itemCount}`)}
              {categories.map((cat) => chip(cat.key, cat.label))}
            </div>
          </div>

          {visibleGroups.length === 0 ? (
            <p className="bg-white rounded-2xl py-12 text-center text-sm text-gray-400">
              {filter === SELECTED_FILTER ? '아직 담은 상품이 없습니다.' : '검색 결과가 없습니다.'}
            </p>
          ) : (
            <div className="space-y-4">
              {visibleGroups.map(({ cat, items }) => (
                <div key={cat.key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <h2 className="px-4 py-2.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                    {cat.emoji} {cat.label} <span className="text-gray-300">· {items.length}</span>
                  </h2>
                  <ul className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <VipProductRow
                        key={item.id}
                        item={item}
                        quantity={quantities[item.id] ?? 0}
                        onChange={setQuantity}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 발주 정보 (데스크톱: 오른쪽 고정 / 모바일: 목록 아래) ── */}
        <aside className="mt-6 lg:mt-0 lg:sticky lg:top-4">
          <VipOrderForm
            form={form}
            onChange={setForm}
            itemCount={summary.itemCount}
            totalQuantity={summary.totalQuantity}
            total={summary.total}
            submitting={submitting}
            error={error}
            onSubmit={submit}
          />
        </aside>
      </div>

      {/* ── 모바일 하단 합계 바 ── */}
      {summary.itemCount > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400">
              {summary.itemCount}종 · {summary.totalQuantity.toLocaleString()}개
            </p>
            <p className="text-lg font-bold text-[#333333] tabular-nums leading-tight">
              {summary.total.toLocaleString()}원
            </p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('vip-order-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="rounded-xl bg-[#333333] text-white font-semibold px-6 py-3"
          >
            발주 정보 입력
          </button>
        </div>
      )}
    </div>
  )
}
