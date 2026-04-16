'use client'

import { useState } from 'react'
import { toggleSoldOut } from '@/app/actions/sold-out'

interface Props {
  productId: string
  initialSoldOut: boolean
}

export default function SoldOutToggle({ productId, initialSoldOut }: Props) {
  const [soldOut, setSoldOut] = useState(initialSoldOut)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    const next = !soldOut
    const result = await toggleSoldOut(productId, next)
    if (result.success) {
      setSoldOut(next)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="font-bold text-[#333333] mb-4">품절 관리</h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            {soldOut ? '현재 품절 상태입니다.' : '현재 판매 중입니다.'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            품절 설정 시 상품에 품절 표시가 나타납니다.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            soldOut ? 'bg-red-500' : 'bg-gray-300'
          } ${loading ? 'opacity-50' : ''}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              soldOut ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {soldOut && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
          이 상품은 품절로 표시되어 고객에게 품절 오버레이가 보입니다.
        </div>
      )}
    </div>
  )
}
