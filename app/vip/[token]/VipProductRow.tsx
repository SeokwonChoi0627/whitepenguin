'use client'

import { Minus, Plus } from 'lucide-react'
import { MAX_QUANTITY_PER_ITEM, type VipCatalogItem } from '@/lib/vip'

interface Props {
  item: VipCatalogItem
  quantity: number
  onChange: (id: string, quantity: number) => void
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(MAX_QUANTITY_PER_ITEM, Math.floor(n)))
}

export default function VipProductRow({ item, quantity, onChange }: Props) {
  const selected = quantity > 0
  const hasDiscount = item.vipPrice < item.regularPrice

  return (
    <li
      className={`flex items-center gap-3 px-3 sm:px-4 py-3 transition-colors ${
        selected ? 'bg-[#FBF6EF]' : 'bg-white'
      } ${item.soldOut ? 'opacity-50' : ''}`}
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-[#f8f5f0] flex-shrink-0 flex items-center justify-center">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-xl opacity-30">🍞</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#333333] leading-tight truncate">{item.name}</p>
        {item.size && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.size}</p>}
        <p className="mt-1 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[15px] font-bold text-[#333333] tabular-nums">
            {item.vipPrice.toLocaleString()}원
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-gray-400 line-through tabular-nums">
                {item.regularPrice.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-[#B5651D]">
                {Math.round((1 - item.vipPrice / item.regularPrice) * 100)}%
              </span>
            </>
          )}
        </p>
      </div>

      {item.soldOut ? (
        <span className="text-xs font-semibold text-gray-500 px-3">품절</span>
      ) : (
        <div className="flex items-center flex-shrink-0 rounded-lg border border-gray-200 bg-white overflow-hidden">
          <button
            type="button"
            aria-label={`${item.name} 수량 줄이기`}
            onClick={() => onChange(item.id, clamp(quantity - 1))}
            disabled={quantity === 0}
            className="w-8 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:text-gray-200"
          >
            <Minus size={14} />
          </button>
          <input
            type="text"
            inputMode="numeric"
            aria-label={`${item.name} 수량`}
            value={quantity === 0 ? '' : String(quantity)}
            placeholder="0"
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, '')
              onChange(item.id, digits === '' ? 0 : clamp(parseInt(digits, 10)))
            }}
            className="w-11 h-9 text-center text-sm font-semibold tabular-nums text-[#333333] border-x border-gray-200 focus:outline-none focus:bg-[#FBF6EF] placeholder:text-gray-300"
          />
          <button
            type="button"
            aria-label={`${item.name} 수량 늘리기`}
            onClick={() => onChange(item.id, clamp(quantity + 1))}
            className="w-8 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50"
          >
            <Plus size={14} />
          </button>
        </div>
      )}
    </li>
  )
}
