'use client'

import { useCallback, useEffect, useState } from 'react'
import { Ticket, X, Check, AlertCircle } from 'lucide-react'
import {
  describeDiscount,
  formatCouponPeriod,
  normalizeCouponCode,
  type AvailableCoupon,
} from '@/lib/coupons'
import type { CartItem } from '@/lib/types'

export interface AppliedCoupon {
  id: string
  code: string | null
  name: string
  summary: string
  discountAmount: number
  finalTotal: number
}

interface CouponSelectorProps {
  cart: CartItem[]
  isLoggedIn: boolean
  applied: AppliedCoupon | null
  onApply: (coupon: AppliedCoupon | null) => void
}

/**
 * 발주서에서 쿠폰을 고르거나 프로모션 코드를 입력하는 영역.
 *
 * 할인 금액은 여기서 계산하지 않는다. 서버(/api/coupons/validate)가 계산한 값을
 * 그대로 받아 쓰고, 제출 시에도 서버가 다시 계산한다 — 화면과 청구액이 어긋나지 않도록.
 */
export default function CouponSelector({ cart, isLoggedIn, applied, onApply }: CouponSelectorProps) {
  const [myCoupons, setMyCoupons] = useState<AvailableCoupon[]>([])
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/coupons')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setMyCoupons(data)
      } catch {
        // 쿠폰 목록 로드 실패는 무시 — 코드 직접 입력은 계속 가능하다
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  const applyCoupon = useCallback(
    async (payload: { code?: string; couponId?: string }) => {
      if (cart.length === 0) {
        setError('상품을 먼저 담아주세요.')
        return
      }
      setBusy(true)
      setError('')
      try {
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, cart }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          setError(data.error || '사용할 수 없는 쿠폰입니다.')
          onApply(null)
          return
        }
        onApply({
          id: data.coupon.id,
          code: data.coupon.code,
          name: data.coupon.name,
          summary: data.coupon.summary,
          discountAmount: data.totals.couponDiscountAmount,
          finalTotal: data.totals.finalTotal,
        })
        setCode('')
      } catch {
        setError('쿠폰 확인 중 오류가 발생했습니다.')
      } finally {
        setBusy(false)
      }
    },
    [cart, onApply]
  )

  // 장바구니가 바뀌면 할인 금액이 달라지므로 적용된 쿠폰을 다시 확인한다
  useEffect(() => {
    if (!applied) return
    const payload = applied.code ? { code: applied.code } : { couponId: applied.id }
    applyCoupon(payload)
    // applyCoupon 은 cart 에 의존하므로, cart 변경 시에만 재검증되도록 의도적으로 좁게 의존한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart])

  if (!isLoggedIn) {
    return (
      <div className="border border-dashed border-gray-200 rounded-xl px-4 py-3 text-center">
        <p className="text-xs text-gray-400">
          쿠폰은 로그인 후 사용할 수 있습니다.
        </p>
      </div>
    )
  }

  if (applied) {
    return (
      <div className="border border-[#C4A882] bg-[#FFF8E7] rounded-xl px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="w-6 h-6 rounded-full bg-[#C4A882] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check size={13} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#8A6A3B] truncate">{applied.name}</p>
            <p className="text-xs text-[#A08860] mt-0.5">
              {applied.summary} · <strong>-{applied.discountAmount.toLocaleString()}원</strong> 적용됨
            </p>
          </div>
          <button
            type="button"
            onClick={() => { onApply(null); setError('') }}
            aria-label="쿠폰 적용 취소"
            className="text-[#A08860] hover:text-[#8A6A3B] transition-colors flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    )
  }

  const usable = myCoupons.filter((c) => !c.used)

  return (
    <div className="space-y-2.5">
      {usable.length > 0 && (
        <div className="space-y-1.5">
          {usable.map((coupon) => (
            <button
              key={coupon.id}
              type="button"
              disabled={busy}
              onClick={() => applyCoupon({ couponId: coupon.id })}
              className="w-full flex items-center gap-2.5 border border-gray-200 hover:border-[#C4A882] hover:bg-[#F7F3EE] rounded-xl px-3.5 py-2.5 text-left transition-colors disabled:opacity-50"
            >
              <Ticket size={15} className="text-[#C4A882] flex-shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-gray-900 truncate">
                  {coupon.name}
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  {describeDiscount(coupon)}
                  {coupon.min_order_amount > 0 &&
                    ` · ${coupon.min_order_amount.toLocaleString()}원 이상`}
                  {` · ${formatCouponPeriod(coupon)}`}
                </span>
              </span>
              <span className="text-xs font-bold text-[#C4A882] flex-shrink-0">적용</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(normalizeCouponCode(e.target.value))}
          placeholder="프로모션 코드 입력"
          maxLength={32}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono tracking-wide uppercase focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
        />
        <button
          type="button"
          disabled={busy || !code.trim()}
          onClick={() => applyCoupon({ code })}
          className="px-4 py-2 bg-[#333333] text-white text-xs font-semibold rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {busy ? '확인 중' : '적용'}
        </button>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-red-500">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
