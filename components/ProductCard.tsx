'use client'

import { Product } from '@/lib/types'
import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'

interface Props {
  product: Product
  onAddToQuote?: (product: Product) => void
  isAdded?: boolean
  soldOut?: boolean
}

export default function ProductCard({ product, onAddToQuote, isAdded, soldOut }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
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

      {/* 가격 + 발주 버튼 (Link 밖에 위치) */}
      <div className="px-4 pb-4 pt-2 flex items-center justify-between">
        <span className="font-bold text-[#333333] text-base">
          {product.priceVatIncluded.toLocaleString()}원
        </span>
        <button
          onClick={() => !soldOut && onAddToQuote?.(product)}
          disabled={soldOut}
          className={`flex items-center gap-1 text-white text-xs px-3 py-1.5 rounded-lg transition-colors ${
            soldOut
              ? 'bg-gray-400 cursor-not-allowed'
              : isAdded ? 'bg-green-500' : 'bg-[#C4A882] hover:bg-[#A08860]'
          }`}
        >
          <ShoppingCart size={12} />
          {soldOut ? '품절' : isAdded ? '발주완료' : '발주'}
        </button>
      </div>
    </div>
  )
}
