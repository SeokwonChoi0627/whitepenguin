import Link from 'next/link'
import { ChevronRight, ImageIcon, LayoutGrid, MessageSquare } from 'lucide-react'
import { PRODUCTS } from '@/lib/products'
import { CATEGORIES, CATEGORY_MAP } from '@/lib/categories'
import { getAllProductImages } from '@/app/actions/images'

export default async function AdminPage() {
  const allImages = await getAllProductImages()

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-[#333333]">관리자</h1>
          <p className="text-sm text-gray-500 mt-1">
            상품 이미지·설명 및 카테고리 페이지를 관리합니다.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── 게시글·리뷰 관리 ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-[#C4A882]" />
            <h2 className="font-semibold text-[#333333]">게시글·리뷰 관리</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
            <Link href="/admin/board?tab=posts"
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F7F3EE] transition-colors">
              <span className="text-xl w-7 text-center flex-shrink-0">✏️</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#333333] text-sm">커뮤니티 게시글</p>
                <p className="text-xs text-gray-400 mt-0.5">게시글 수정 및 삭제</p>
              </div>
              <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
            </Link>
            <Link href="/admin/board?tab=reviews"
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F7F3EE] transition-colors">
              <span className="text-xl w-7 text-center flex-shrink-0">⭐</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#333333] text-sm">상품 리뷰</p>
                <p className="text-xs text-gray-400 mt-0.5">리뷰 수정 및 삭제</p>
              </div>
              <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
            </Link>
            <Link href="/admin/board?tab=qna"
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F7F3EE] transition-colors">
              <span className="text-xl w-7 text-center flex-shrink-0">💬</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#333333] text-sm">Q&A 문의</p>
                <p className="text-xs text-gray-400 mt-0.5">문의 답변 및 삭제</p>
              </div>
              <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
            </Link>
          </div>
        </div>

        {/* ── 카테고리 관리 ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid size={16} className="text-[#C4A882]" />
            <h2 className="font-semibold text-[#333333]">카테고리 관리</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.key}
                href={`/admin/categories/${cat.key}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-[#F7F3EE] transition-colors"
              >
                <span className="text-xl w-7 text-center flex-shrink-0">{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#333333] text-sm">{cat.label}</p>
                </div>
                <span className="text-xs text-gray-400">설명 편집</span>
                <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── 상품 관리 ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={16} className="text-[#C4A882]" />
            <h2 className="font-semibold text-[#333333]">상품 관리</h2>
          </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {PRODUCTS.map((product) => {
            const category = CATEGORY_MAP[product.category]
            const count = (allImages[product.id] || []).length

            return (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F7F3EE] transition-colors"
              >
                {/* 썸네일 */}
                <div
                  className="w-11 h-11 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{
                    backgroundColor: product.image ? '#f8f5f0' : (product.imageColor || '#F7F3EE'),
                  }}
                >
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg opacity-30">🍞</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#333333] text-sm">{product.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {category?.label} · {product.id}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-sm">
                  <ImageIcon size={13} className="text-gray-300" />
                  <span className={count > 0 ? 'text-[#C4A882] font-semibold' : 'text-gray-300'}>
                    {count}
                  </span>
                </div>

                <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
              </Link>
            )
          })}
          </div>
        </div>
      </div>
    </div>
  )
}
