'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Star, ThumbsUp, Search, ChevronDown, PenLine } from 'lucide-react'
import Link from 'next/link'

const CATEGORY_TABS = ['전체', '제과틀', '반느통', '커버천', '쿠키틀', '푸딩틀', '도구', '소모품']

export interface Review {
  id: string
  product_name: string
  category: string
  rating: number
  author_name: string
  created_at: string
  title: string
  content: string
  likes: number
  images: string[]
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  )
}

export default function ReviewsClient({ initialReviews }: { initialReviews: Review[] }) {
  const { data: session } = useSession()
  const [reviews] = useState<Review[]>(initialReviews)
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('최신순')

  const filtered = reviews
    .filter((r) => {
      const matchCat = selectedCategory === '전체' || r.category === selectedCategory
      const matchSearch = searchQuery === '' ||
        r.product_name.includes(searchQuery) || r.title.includes(searchQuery) || r.content.includes(searchQuery)
      return matchCat && matchSearch
    })
    .sort((a, b) => {
      if (sortBy === '추천순') return b.likes - a.likes
      if (sortBy === '별점높은순') return b.rating - a.rating
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#333333] mb-1">상품 리뷰</h1>
          <p className="text-gray-500 text-sm">실제 구매 고객의 솔직한 후기</p>
        </div>
        {session ? (
          <Link href="/reviews/write"
            className="flex items-center gap-2 bg-[#333333] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a1a1a] transition-colors">
            <PenLine size={16} />
            리뷰 작성
          </Link>
        ) : (
          <Link href="/auth"
            className="flex items-center gap-2 border border-[#333333] text-[#333333] px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            <PenLine size={16} />
            로그인 후 작성
          </Link>
        )}
      </div>

      {/* 요약 */}
      {reviews.length > 0 && (
        <div className="bg-[#333333] text-white rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center">
            <p className="text-5xl font-black text-[#C4A882]">{avgRating}</p>
            <StarRating rating={Math.round(Number(avgRating))} size={18} />
            <p className="text-sm text-gray-400 mt-1">총 {reviews.length}개 리뷰</p>
          </div>
          <div className="flex-1 w-full space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => r.rating === star).length
              const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-4 text-gray-400">{star}</span>
                  <Star size={12} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div className="bg-[#C4A882] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-gray-400 text-xs">{count}개</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="상품명, 내용으로 검색..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]" />
        </div>
        <div className="relative">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#C4A882] cursor-pointer">
            {['최신순', '추천순', '별점높은순'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORY_TABS.map((cat) => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat ? 'bg-[#333333] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* 리뷰 목록 */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-3xl mb-2">{reviews.length === 0 ? '⭐' : '🔍'}</p>
            <p className="text-sm mb-4">
              {reviews.length === 0 ? '아직 작성된 리뷰가 없습니다.' : '검색 결과가 없습니다.'}
            </p>
            {session && reviews.length === 0 && (
              <Link href="/reviews/write"
                className="inline-block bg-[#333333] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1a1a1a] transition-colors">
                첫 리뷰 작성하기
              </Link>
            )}
          </div>
        ) : filtered.map((review) => (
          <Link key={review.id} href={`/reviews/${review.id}`}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all block">
            {/* 사진 */}
            {review.images && review.images.length > 0 && (
              <div className={`grid gap-0.5 ${review.images.length === 1 ? 'grid-cols-1' : review.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {review.images.slice(0, 3).map((src, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={idx} src={src} alt="" className="w-full h-48 object-cover" />
                ))}
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <h3 className="font-bold text-[#333333]">{review.title}</h3>
                </div>
                <span className="text-xs bg-[#EDE4D8] text-[#A08860] px-2 py-1 rounded-full flex-shrink-0 font-medium">
                  {review.category}
                </span>
              </div>
              <p className="text-xs text-[#C4A882] font-medium mb-2">{review.product_name}</p>
              <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">{review.content}</p>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span className="font-medium text-gray-500">{review.author_name}</span>
                <span className="flex items-center gap-1.5">
                  <ThumbsUp size={13} />
                  도움돼요 {review.likes}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
