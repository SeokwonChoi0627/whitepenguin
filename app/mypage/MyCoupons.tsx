import Link from 'next/link'
import { Ticket } from 'lucide-react'
import {
  checkCouponUsable,
  describeDiscount,
  formatCouponPeriod,
  type AvailableCoupon,
} from '@/lib/coupons'

export default function MyCoupons({ coupons }: { coupons: AvailableCoupon[] }) {
  if (coupons.length === 0) return null

  const usable = coupons.filter((c) => !c.used && checkCouponUsable(c).ok)
  const spent = coupons.filter((c) => c.used || !checkCouponUsable(c).ok)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-6">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900">내 쿠폰</h3>
        <span className="text-xs text-gray-400">사용 가능 {usable.length}장</span>
      </div>

      {usable.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          <p className="text-2xl mb-2">🎟️</p>
          사용 가능한 쿠폰이 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {usable.map((coupon) => (
            <div key={coupon.id} className="px-5 py-4 flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#F7F3EE] text-[#C4A882] flex items-center justify-center flex-shrink-0">
                <Ticket size={17} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{coupon.name}</p>
                <p className="text-sm font-semibold text-[#A08860] mt-0.5">
                  {describeDiscount(coupon)}
                </p>
                {coupon.description && (
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{coupon.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {coupon.min_order_amount > 0
                    ? `${coupon.min_order_amount.toLocaleString()}원 이상 · `
                    : ''}
                  {formatCouponPeriod(coupon)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {spent.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">
            사용 완료·기간 만료 {spent.length}장
          </p>
        </div>
      )}

      {usable.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          <Link
            href="/quote"
            className="flex items-center justify-center gap-2 w-full bg-[#C4A882] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#A08860] transition-colors"
          >
            쿠폰 쓰러 가기
          </Link>
        </div>
      )}
    </div>
  )
}
