'use client'

import { useState } from 'react'
import { Product } from '@/lib/types'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { MAX_QTY, MIN_QTY, clampQty, parseQtyInput } from '@/lib/cart'

interface Props {
  product: Product
  onAddToQuote?: (product: Product, quantity: number) => void
  isAdded?: boolean
  soldOut?: boolean
}

export default function ProductCard({ product, onAddToQuote, isAdded, soldOut }: Props) {
  const [quantity, setQuantity] = useState(MIN_QTY)

  const handleAdd = () => {
    if (soldOut) return
    onAddToQuote?.(product, quantity)
    setQuantity(MIN_QTY)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex flex-col">
      {/* 이미지 + 텍스트 영역 → 클릭 시 상세 페이지 이동 */}
      <Link href={`/product/${product.id}`} className="block">
        {/* 이미지 영역 */}
        <div
          className="h-44 flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: product.image ? '#f8f5f0' : (product.imageColor || '#F7F3EE') }}
        >
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-5xl opacity-20">🍞</span>
          )}
          {soldOut && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-lg font-bold tracking-widest">품절</span>
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-semibold text-[#333333] text-sm leading-tight mb-1">
            {product.name}
          </h3>
          <div className="space-y-0.5">
            {product.size && <p className="text-xs text-gray-500">{product.size}</p>}
            {product.holes && (
              <p className="text-xs text-gray-500">
                {product.holes}{product.holeSize ? ` · ${product.holeSize}` : ''}
              </p>
            )}
            {product.note && <p className="text-xs text-[#A08860]">{product.note}</p>}
          </div>
        </div>
      </Link>

      {/* 가격 + 수량 + 발주 버튼 (Link 밖에 위치) */}
      <div className="px-4 pb-4 pt-2 mt-auto space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-bold text-[#333333] text-base">
            {product.priceVatIncluded.toLocaleString()}원
          </span>
          {!soldOut && quantity > 1 && (
            <span className="text-xs text-[#A08860] font-semibold tabular-nums">
              {(product.priceVatIncluded * quantity).toLocaleString()}원
            </span>
          )}
        </div>

        <div className="flex items-stretch gap-1.5">
          {/* 수량 조절 */}
          <div
            className={`flex items-center border rounded-lg overflow-hidden flex-shrink-0 ${
              soldOut ? 'border-gray-200 opacity-40' : 'border-gray-200'
            }`}
          >
            <QtyButton
              label={`${product.name} 수량 줄이기`}
              disabled={soldOut || quantity <= MIN_QTY}
              onClick={() => setQuantity(clampQty(quantity - 1))}
            >
              <Minus size={11} />
            </QtyButton>
            <input
              type="text"
              inputMode="numeric"
              aria-label={`${product.name} 수량`}
              disabled={soldOut}
              value={quantity}
              onChange={(e) => setQuantity(parseQtyInput(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="w-8 text-center text-xs font-bold text-[#333333] tabular-nums border-0 focus:outline-none focus:bg-[#F7F3EE] disabled:bg-transparent p-0"
            />
            <QtyButton
              label={`${product.name} 수량 늘리기`}
              disabled={soldOut || quantity >= MAX_QTY}
              onClick={() => setQuantity(clampQty(quantity + 1))}
            >
              <Plus size={11} />
            </QtyButton>
          </div>

          {/* 발주 담기 */}
          <button
            onClick={handleAdd}
            disabled={soldOut}
            className={`flex-1 flex items-center justify-center gap-1 text-white text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors ${
              soldOut
                ? 'bg-gray-400 cursor-not-allowed'
                : isAdded
                  ? 'bg-green-500'
                  : 'bg-[#C4A882] hover:bg-[#A08860]'
            }`}
          >
            <ShoppingCart size={12} />
            {soldOut ? '품절' : isAdded ? '발주완료' : '발주'}
          </button>
        </div>
      </div>
    </div>
  )
}

function QtyButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-6 h-7 flex items-center justify-center text-gray-500 hover:bg-[#F7F3EE] hover:text-[#A08860] transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500"
    >
      {children}
    </button>
  )
}
