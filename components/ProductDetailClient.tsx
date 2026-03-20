'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ChevronLeft, ShoppingCart, Package, Ruler, Hash, Tag } from 'lucide-react'
import { Product, Category } from '@/lib/types'
import ImageCarousel from './ImageCarousel'
import ProductDescription from './ProductDescription'

interface Props {
  product: Product
  category: Category | undefined
  images: string[]
  descriptionHtml: string
}

export default function ProductDetailClient({ product, category, images, descriptionHtml }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const [added, setAdded] = useState(false)

  const handleAddToQuote = () => {
    if (!session) {
      router.push('/auth')
      return
    }
    const stored = localStorage.getItem('quote-cart')
    const cart = stored ? JSON.parse(stored) : []
    const existing = cart.find(
      (item: { product: { id: string }; quantity: number }) => item.product.id === product.id
    )
    if (existing) {
      existing.quantity += 1
    } else {
      cart.push({ product, quantity: 1 })
    }
    localStorage.setItem('quote-cart', JSON.stringify(cart))
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      {/* 브레드크럼 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link
              href="/products"
              className="hover:text-[#333333] transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              상품 목록
            </Link>
            <span>/</span>
            <span>{category?.label}</span>
            <span>/</span>
            <span className="text-[#333333] font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* 상단: 이미지 캐러셀 + 상품 정보 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="md:flex">
            {/* 이미지 캐러셀 */}
            <div className="md:w-1/2">
              <ImageCarousel images={images} productName={product.name} />
            </div>

            {/* 상품 정보 */}
            <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1 bg-[#F7F3EE] text-[#A08860] text-xs font-medium px-3 py-1 rounded-full mb-4">
                  {category?.emoji} {category?.label}
                </span>

                <h1 className="text-2xl font-bold text-[#333333] mb-2">{product.name}</h1>

                <div className="space-y-3 my-6">
                  {product.size && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 bg-[#F7F3EE] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Ruler size={15} className="text-[#A08860]" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">크기</p>
                        <p className="text-[#333333] font-medium">{product.size}</p>
                      </div>
                    </div>
                  )}
                  {product.holes && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 bg-[#F7F3EE] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package size={15} className="text-[#A08860]" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">구성</p>
                        <p className="text-[#333333] font-medium">
                          {product.holes}
                          {product.holeSize ? ` · ${product.holeSize}` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-[#F7F3EE] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Hash size={15} className="text-[#A08860]" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">관리번호</p>
                      <p className="text-[#333333] font-medium">
                        {product.id} · {product.code}
                      </p>
                    </div>
                  </div>
                  {product.note && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 bg-[#F7F3EE] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Tag size={15} className="text-[#A08860]" />
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">비고</p>
                        <p className="text-[#C4A882] font-medium">{product.note}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 가격 + 발주 버튼 */}
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-[#333333]">
                    {product.priceVatIncluded.toLocaleString()}
                  </span>
                  <span className="text-base text-gray-500">원 (VAT 포함)</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToQuote}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                      added
                        ? 'bg-green-500 text-white'
                        : 'bg-[#C4A882] hover:bg-[#A08860] text-white'
                    }`}
                  >
                    <ShoppingCart size={18} />
                    {added ? '발주서에 추가됨!' : '발주서에 추가'}
                  </button>
                  <Link
                    href="/quote"
                    className="px-4 py-3 rounded-xl border border-[#C4A882] text-[#C4A882] text-sm font-semibold hover:bg-[#F7F3EE] transition-colors"
                  >
                    발주서 보기
                  </Link>
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">
                  발주서 작성 후 담당자 확인을 거쳐 최종 견적이 안내됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 상세 설명 */}
        <ProductDescription html={descriptionHtml} />

        {/* 뒤로가기 */}
        <div className="text-center">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-400 hover:text-[#333333] transition-colors"
          >
            ← 이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}
