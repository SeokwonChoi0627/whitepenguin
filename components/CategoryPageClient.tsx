'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Category, Product } from '@/lib/types'
import ProductCard from '@/components/ProductCard'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props {
  category: Category
  products: Product[]
  descriptionHtml: string
  soldOutMap: Record<string, boolean>
}

export default function CategoryPageClient({ category, products, descriptionHtml, soldOutMap }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const [addedProduct, setAddedProduct] = useState<string | null>(null)

  const handleAddToQuote = (product: Product) => {
    if (!session) {
      router.push('/auth')
      return
    }
    const existing = JSON.parse(localStorage.getItem('quoteCart') || '[]')
    const idx = existing.findIndex((i: { product: Product }) => i.product.id === product.id)
    if (idx >= 0) existing[idx].quantity += 1
    else existing.push({ product, quantity: 1 })
    localStorage.setItem('quoteCart', JSON.stringify(existing))
    setAddedProduct(product.id)
    setTimeout(() => setAddedProduct(null), 1500)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ── 카테고리 헤더 ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Link href="/products" className="hover:text-[#333] transition-colors">전체 상품</Link>
          <span>/</span>
          <span className="text-[#333]">{category.label}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{category.emoji}</span>
          <div>
            <h1 className="text-3xl font-black text-[#333333]">{category.label}</h1>
            <p className="text-gray-500 mt-1">{category.description}</p>
          </div>
        </div>
      </div>

      {/* ── 상품 바로가기 배너 ── */}
      {products.length > 0 && (
        <Link
          href={`/products?category=${category.key}`}
          className="flex items-center justify-between bg-[#C4A882] hover:bg-[#A08860] rounded-2xl px-6 py-5 mb-10 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl">{category.emoji}</span>
            <div>
              <p className="font-bold text-base text-white">{category.label} 전체 상품 보기</p>
              <p className="text-sm text-white/70 mt-0.5">총 {products.length}개 상품</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-white group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      {/* ── 카테고리 상세 설명 ── */}
      {descriptionHtml && (
        <section className="bg-white rounded-2xl border border-gray-200 p-8 mb-12">
          <div
            className="desc-content"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        </section>
      )}

      {/* ── 상품 목록 ── */}
      {products.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[#333333] mb-4">
            {category.label} 상품 <span className="text-[#C4A882]">{products.length}</span>
          </h2>

          {addedProduct && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
              발주서에 추가되었습니다. <a href="/quote" className="underline font-medium">발주서 보기</a>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAddToQuote={handleAddToQuote} soldOut={!!soldOutMap[product.id]} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
