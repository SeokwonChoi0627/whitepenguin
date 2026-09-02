'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Ticket, Power, Trash2, Copy } from 'lucide-react'
import {
  describeDiscount,
  formatCouponPeriod,
  normalizeCouponCode,
  type Coupon,
  type DiscountType,
} from '@/lib/coupons'

type AdminCoupon = Coupon & { redemption_count: number }

/** 폼 상태 — 모두 문자열로 다루고 제출 직전에 변환한다 (빈칸 = null) */
interface FormState {
  code: string
  name: string
  description: string
  discount_type: DiscountType
  discount_value: string
  min_order_amount: string
  max_discount_amount: string
  expires_at: string
  max_redemptions: string
  auto_apply_to_members: boolean
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percent',
  discount_value: '10',
  min_order_amount: '30000',
  max_discount_amount: '',
  expires_at: '',
  max_redemptions: '',
  auto_apply_to_members: false,
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/coupons?scope=all')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '불러오지 못했습니다.')
      setCoupons(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.auto_apply_to_members ? null : form.code,
          name: form.name,
          description: form.description || null,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          min_order_amount: Number(form.min_order_amount || 0),
          max_discount_amount:
            form.discount_type === 'percent' && form.max_discount_amount
              ? Number(form.max_discount_amount)
              : null,
          starts_at: null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
          auto_apply_to_members: form.auto_apply_to_members,
          is_active: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '생성에 실패했습니다.')
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (coupon: AdminCoupon) => {
    const res = await fetch(`/api/coupons/${coupon.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !coupon.is_active }),
    })
    if (res.ok) load()
    else setError((await res.json()).error || '변경에 실패했습니다.')
  }

  const remove = async (coupon: AdminCoupon) => {
    if (!confirm(`'${coupon.name}' 쿠폰을 삭제할까요?\n사용 기록이 있으면 삭제 대신 비활성화됩니다.`)) return
    const res = await fetch(`/api/coupons/${coupon.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setError(data.error || '삭제에 실패했습니다.'); return }
    if (data.message) alert(data.message)
    load()
  }

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft size={22} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#333333]">쿠폰 관리</h1>
            <p className="text-sm text-gray-500 mt-0.5">할인 쿠폰과 프로모션 코드를 발행합니다.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 bg-[#333333] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
          >
            <Plus size={15} />
            새 쿠폰
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {showForm && (
          <form onSubmit={create} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-[#333333]">새 쿠폰 만들기</h2>

            <label className="flex items-start gap-2.5 bg-[#F7F3EE] rounded-xl px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.auto_apply_to_members}
                onChange={(e) => setForm({ ...form, auto_apply_to_members: e.target.checked })}
                className="mt-0.5 accent-[#333333]"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">전 회원 자동 지급</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  코드 없이 모든 회원의 마이페이지에 표시됩니다. 끄면 프로모션 코드가 필요합니다.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="쿠폰 이름" required>
                <input
                  type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="가을 이벤트 10% 할인"
                  className={inputClass}
                />
              </Field>
              {!form.auto_apply_to_members && (
                <Field label="프로모션 코드" required>
                  <input
                    type="text" required value={form.code}
                    onChange={(e) => setForm({ ...form, code: normalizeCouponCode(e.target.value) })}
                    placeholder="AUTUMN10"
                    className={`${inputClass} font-mono tracking-wide`}
                  />
                </Field>
              )}
            </div>

            <Field label="설명">
              <input
                type="text" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="고객에게 보이는 안내 문구"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="할인 방식">
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({
                    ...form,
                    discount_type: e.target.value as DiscountType,
                    max_discount_amount: '',
                  })}
                  className={inputClass}
                >
                  <option value="percent">정률 (%)</option>
                  <option value="fixed">정액 (원)</option>
                </select>
              </Field>
              <Field label={form.discount_type === 'percent' ? '할인율 (%)' : '할인액 (원)'} required>
                <input
                  type="number" required min={1} value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="최소 주문금액">
                <input
                  type="number" min={0} value={form.min_order_amount}
                  onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                  className={inputClass}
                />
              </Field>
              {form.discount_type === 'percent' && (
                <Field label="할인 상한 (원)">
                  <input
                    type="number" min={1} value={form.max_discount_amount}
                    onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                    placeholder="없으면 비움"
                    className={inputClass}
                  />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="사용 종료일">
                <input
                  type="date" value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="전체 발행 한도">
                <input
                  type="number" min={1} value={form.max_redemptions}
                  onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })}
                  placeholder="없으면 무제한"
                  className={inputClass}
                />
              </Field>
            </div>

            <p className="text-xs text-gray-500 bg-[#F7F3EE] rounded-lg px-3.5 py-2.5 leading-relaxed">
              쿠폰은 <strong>1인 1회</strong> 사용할 수 있고, 수량 할인과 <strong>중복 적용</strong>됩니다.
              정률 쿠폰은 수량 할인이 적용된 금액을 기준으로 계산됩니다.
            </p>

            <div className="flex gap-2">
              <button
                type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit" disabled={saving}
                className="flex-[2] bg-[#333333] text-white font-bold py-2.5 rounded-xl text-sm hover:bg-[#1a1a1a] transition-colors disabled:opacity-40"
              >
                {saving ? '만드는 중...' : '쿠폰 만들기'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-center text-gray-400 text-sm py-16">불러오는 중...</p>
        ) : coupons.length === 0 ? (
          <div className="bg-white rounded-2xl py-16 text-center">
            <Ticket size={26} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">아직 쿠폰이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <CouponRow
                key={coupon.id}
                coupon={coupon}
                onToggle={() => toggleActive(coupon)}
                onDelete={() => remove(coupon)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]'

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function CouponRow({
  coupon, onToggle, onDelete,
}: { coupon: AdminCoupon; onToggle: () => void; onDelete: () => void }) {
  const [copied, setCopied] = useState(false)
  const exhausted =
    coupon.max_redemptions !== null && coupon.redemption_count >= coupon.max_redemptions

  const copyCode = async () => {
    if (!coupon.code) return
    try {
      await navigator.clipboard.writeText(coupon.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 접근이 막힌 환경에서는 무시한다
    }
  }

  return (
    <article className={`bg-white rounded-2xl shadow-sm px-5 py-4 ${coupon.is_active ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#333333] text-sm">{coupon.name}</h3>
            {coupon.code ? (
              <button
                type="button" onClick={copyCode}
                className="inline-flex items-center gap-1 font-mono text-xs bg-[#F7F3EE] text-[#8A6A3B] px-2 py-0.5 rounded hover:bg-[#EDE4D8] transition-colors"
              >
                {coupon.code}
                <Copy size={10} />
              </button>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                전 회원 자동 지급
              </span>
            )}
            {!coupon.is_active && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                비활성
              </span>
            )}
            {exhausted && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                소진됨
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-[#A08860] mt-1">{describeDiscount(coupon)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {coupon.min_order_amount > 0 && `${coupon.min_order_amount.toLocaleString()}원 이상 · `}
            {formatCouponPeriod(coupon)}
            {' · '}
            사용 {coupon.redemption_count}건
            {coupon.max_redemptions !== null && ` / ${coupon.max_redemptions}건`}
          </p>
          {copied && <p className="text-xs text-[#8A6A3B] mt-1">코드를 복사했습니다.</p>}
        </div>

        <div className="flex gap-1.5 flex-shrink-0">
          <button
            type="button" onClick={onToggle}
            aria-label={coupon.is_active ? '비활성화' : '활성화'}
            title={coupon.is_active ? '비활성화' : '활성화'}
            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 flex items-center justify-center hover:border-[#C4A882] hover:text-[#C4A882] transition-colors"
          >
            <Power size={14} />
          </button>
          <button
            type="button" onClick={onDelete}
            aria-label="삭제" title="삭제"
            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-400 flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  )
}
