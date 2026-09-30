'use client'

import { Loader2 } from 'lucide-react'

export interface VipFormState {
  companyName: string
  representative: string
  phone: string
  email: string
  address: string
  businessNumber: string
  notes: string
}

interface Props {
  form: VipFormState
  onChange: (form: VipFormState) => void
  itemCount: number
  totalQuantity: number
  total: number
  submitting: boolean
  error: string
  onSubmit: () => void
}

const FIELDS: { key: keyof VipFormState; label: string; required?: boolean; type?: string; placeholder?: string }[] = [
  { key: 'companyName', label: '업체명', required: true },
  { key: 'representative', label: '담당자명', required: true },
  { key: 'phone', label: '연락처', required: true, type: 'tel', placeholder: '010-0000-0000' },
  { key: 'email', label: '이메일 (견적서 수신)', type: 'email' },
  { key: 'address', label: '배송지', required: true },
  { key: 'businessNumber', label: '사업자번호' },
]

export default function VipOrderForm({
  form, onChange, itemCount, totalQuantity, total, submitting, error, onSubmit,
}: Props) {
  const set = (key: keyof VipFormState, value: string) => onChange({ ...form, [key]: value })

  return (
    <form
      id="vip-order-form"
      onSubmit={(e) => { e.preventDefault(); onSubmit() }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="bg-[#333333] text-white px-5 py-4">
        <p className="text-xs text-white/60">발주 합계 (VAT 포함)</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">{total.toLocaleString()}원</p>
        <p className="text-xs text-white/60 mt-1">
          {itemCount}종 · 총 {totalQuantity.toLocaleString()}개
        </p>
      </div>

      <div className="px-5 py-4 space-y-3">
        <p className="text-xs text-gray-400">저장된 정보가 채워져 있습니다. 바뀐 내용만 수정하세요.</p>
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs font-medium text-gray-500">
              {f.label}{f.required && <span className="text-[#B5651D]"> *</span>}
            </span>
            <input
              type={f.type ?? 'text'}
              value={form[f.key]}
              required={f.required}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#333333] focus:outline-none focus:border-[#C4A882] focus:ring-2 focus:ring-[#C4A882]/20"
            />
          </label>
        ))}
        <label className="block">
          <span className="text-xs font-medium text-gray-500">요청사항</span>
          <textarea
            value={form.notes}
            rows={2}
            maxLength={500}
            onChange={(e) => set('notes', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#333333] resize-none focus:outline-none focus:border-[#C4A882] focus:ring-2 focus:ring-[#C4A882]/20"
          />
        </label>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || itemCount === 0}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#333333] text-white font-semibold py-3.5 hover:bg-black active:scale-[0.99] transition disabled:bg-gray-300"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {itemCount === 0 ? '수량을 입력해 주세요' : submitting ? '발주 접수 중…' : '발주하기'}
        </button>
        <p className="text-[11px] text-gray-400 text-center">
          이메일을 입력하시면 입금 계좌가 적힌 견적서를 보내드립니다.
        </p>
      </div>
    </form>
  )
}
