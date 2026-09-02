import Link from 'next/link'
import { RotateCcw } from 'lucide-react'
import { productLabel } from '@/lib/returns'

export interface OrderSummary {
  id: string
  order_number: string
  cart: { product: { name: string; size?: string }; quantity: number }[]
  final_total: number
  discount_rate: number
  created_at: string
}

interface OrderHistoryProps {
  orders: OrderSummary[]
  /** 반품요청이 1건 이상 접수된 주문번호 */
  returnedOrderNumbers: Set<string>
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

function summarizeCart(cart: OrderSummary['cart']): string {
  const first = cart[0]
  if (!first) return '-'
  const rest = cart.length > 1 ? ` 외 ${cart.length - 1}종` : ''
  return productLabel(first.product.name, first.product.size) + rest
}

export default function OrderHistory({ orders, returnedOrderNumbers }: OrderHistoryProps) {
  if (orders.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        <p className="text-3xl mb-2">📋</p>
        아직 발주 내역이 없습니다.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {orders.map((order) => {
        const itemCount = order.cart.reduce((sum, item) => sum + item.quantity, 0)
        const hasReturn = returnedOrderNumbers.has(order.order_number)

        return (
          <div key={order.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">{formatDate(order.created_at)}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs font-mono text-gray-400">#{order.order_number}</span>
                  {hasReturn && (
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#EDE4D8] text-[#8A6A3B]">
                      반품 접수됨
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {summarizeCart(order.cart)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">총 {itemCount}개</p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-[#333333]">
                  {order.final_total.toLocaleString()}원
                </p>
                {order.discount_rate > 0 && (
                  <span className="text-xs text-[#C4A882] font-semibold">
                    {order.discount_rate * 100}% 할인 적용
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-2.5">
              <Link
                href={`/mypage/return/${encodeURIComponent(order.order_number)}`}
                className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:border-[#C4A882] hover:text-[#C4A882] hover:bg-[#F7F3EE] transition-colors"
              >
                <RotateCcw size={12} />
                {hasReturn ? '반품 추가 요청' : '반품요청'}
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
