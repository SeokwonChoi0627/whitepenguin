'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { PRODUCTS } from '@/lib/products'
import { CATEGORIES, CATEGORY_MAP } from '@/lib/categories'
import { Product } from '@/lib/types'
import ProductCard from '@/components/ProductCard'
import { Search, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Props {
  thumbnailOverrides: Record<string, string>
}

function ProductsInner({ thumbnailOverrides }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const initialCategory = searchParams.get('category') || 'all'

  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [addedProduct, setAddedProduct] = useState<string | null>(null)

  // 썸네일 오버라이드 병합
  const products = useMemo(
    () => PRODUCTS.map((p) => ({ ...p, image: thumbnailOverrides[p.id] ?? p.image })),
    [thumbnailOverrides]
  )

  const categoryOrder = useMemo(
    () => Object.fromEntries(CATEGORIES.map((c, i) => [c.key, i])),
    []
  )

  const filtered = useMemo(() => {
    return products
      .filter((p) => {
        const matchCat = selectedCategory === 'all' || p.category === selectedCategory
        const matchSearch = searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase())
        return matchCat && matchSearch
      })
      .sort((a, b) => (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99))
  }, [products, selectedCategory, searchQuery, categoryOrder])

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">전체 상품</h1>
        <p className="text-gray-500 text-sm">총 {PRODUCTS.length}개 상품</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-52 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-20">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">카테고리</h2>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === 'all' ? 'bg-[#333333] text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  전체 ({PRODUCTS.length})
                </button>
              </li>
              {CATEGORIES.map((cat) => {
                const count = PRODUCTS.filter((p) => p.category === cat.key).length
                return (
                  <li key={cat.key}>
                    <button
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${
                        selectedCategory === cat.key ? 'bg-[#333333] text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{cat.emoji} {cat.label}</span>
                      <span className={`text-xs ${selectedCategory === cat.key ? 'text-[#EDE4D8]' : 'text-gray-400'}`}>
                        {count}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* ── 카테고리 자세히보기 배너 ── */}
          {selectedCategory !== 'all' && CATEGORY_MAP[selectedCategory] && (
            <Link
              href={`/category/${selectedCategory}`}
              className="flex items-center justify-between bg-[#C4A882] hover:bg-[#A08860] rounded-xl px-5 py-4 mb-5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{CATEGORY_MAP[selectedCategory].emoji}</span>
                <div>
                  <p className="font-bold text-sm text-white">{CATEGORY_MAP[selectedCategory].label} 카테고리 자세히보기</p>
                  <p className="text-xs text-white/70 mt-0.5">{CATEGORY_MAP[selectedCategory].description}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-white group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </Link>
          )}

          <div className="relative mb-5">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="상품명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
            />
          </div>

          {addedProduct && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
              발주서에 추가되었습니다. <a href="/quote" className="underline font-medium">발주서 보기</a>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p>검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} onAddToQuote={handleAddToQuote} isAdded={addedProduct === product.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProductsContent({ thumbnailOverrides }: Props) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <ProductsInner thumbnailOverrides={thumbnailOverrides} />
    </Suspense>
  )
}
