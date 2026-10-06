'use client'

import { useState } from 'react'
import { Copy, Check, Landmark } from 'lucide-react'
import { BANK_ACCOUNT, BANK_ACCOUNT_TEXT, DEPOSIT_NOTICE } from '@/lib/payment'

interface Props {
  /** 입금해야 할 금액. 모르면 생략한다. */
  amount?: number
}

/**
 * 발주 완료 후 보여주는 입금 안내 블록.
 * 입금 전에는 발주가 확정되지 않는다는 점과 계좌번호를 함께 안내한다.
 */
export default function DepositGuide({ amount }: Props) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(`${BANK_ACCOUNT.bank} ${BANK_ACCOUNT.number}`)
      setCopyFailed(false)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 권한이 없는 브라우저 — 계좌번호는 화면에 그대로 보이므로 안내만 한다.
      setCopyFailed(true)
    }
  }

  return (
    <div className="rounded-xl border border-[#E3D4BE] bg-[#FDF9F3] p-4">
      <div className="flex items-center gap-2">
        <Landmark size={15} className="text-[#A08860] flex-shrink-0" />
        <p className="text-sm font-bold text-[#333333]">입금 후 발주가 확정됩니다</p>
      </div>

      {amount !== undefined && (
        <div className="flex items-baseline justify-between mt-3">
          <span className="text-xs text-gray-500">입금하실 금액</span>
          <span className="text-lg font-black text-[#333333] tabular-nums">
            {amount.toLocaleString()}원
          </span>
        </div>
      )}

      <div className="mt-2 rounded-lg bg-white border border-[#EBDFCC] px-3 py-2.5">
        <p className="text-[11px] text-gray-400">입금 계좌</p>
        <div className="flex items-start justify-between gap-2 mt-0.5">
          <div className="min-w-0">
            {/* 좁은 화면에서도 계좌번호가 중간에 끊기지 않도록 은행명과 번호를 각각 묶는다. */}
            <p className="text-sm font-bold text-[#333333] leading-snug">
              <span className="whitespace-nowrap">{BANK_ACCOUNT.bank}</span>{' '}
              <span className="whitespace-nowrap tabular-nums">{BANK_ACCOUNT.number}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">예금주 {BANK_ACCOUNT.holder}</p>
          </div>
          <button
            type="button"
            onClick={copyAccount}
            aria-label="계좌번호 복사"
            className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition"
          >
            {copied ? <Check size={12} className="text-[#A08860]" /> : <Copy size={12} />}
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed mt-2.5">
        {DEPOSIT_NOTICE} 입금자명은 발주하신 업체명으로 적어 주시면 확인이 빠릅니다.
      </p>
      {copyFailed && (
        <p className="text-xs text-red-500 mt-1.5">
          복사에 실패했습니다. 위 계좌번호를 직접 입력해 주세요. ({BANK_ACCOUNT_TEXT})
        </p>
      )}
    </div>
  )
}
