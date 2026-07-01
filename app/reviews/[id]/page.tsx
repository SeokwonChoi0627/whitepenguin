'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Star, ThumbsUp, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Review {
  id: string
  title: string
  content: string
  author_name: string
  product_name: string
  category: string
  rating: number
  created_at: string
  likes: number
  images: string[]
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={18} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  )
}

export default function ReviewDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    fetch(`/api/reviews/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) router.push('/reviews')
        else setReview(data)
      })
      .finally(() => setLoading(false))
  }, [id, router])

  const handleLike = () => {
    if (liked || !review) return
    setLiked(true)
    setReview({ ...review, likes: review.likes + 1 })
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>
  }
  if (!review) return null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reviews" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <span className="text-xs bg-[#EDE4D8] text-[#A08860] px-2.5 py-1 rounded-full font-medium">
          {review.category}
        </span>
      </div>

      <article className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* 사진 */}
        {review.images && review.images.length > 0 && (
          <div className="flex flex-col gap-1 bg-gray-100">
            {review.images.map((src, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={idx} src={src} alt="" className="w-full h-auto block" />
            ))}
          </div>
        )}

        <div className="p-6">
          {/* 별점 + 날짜 */}
          <div className="flex items-center gap-3 mb-3">
            <StarRating rating={review.rating} />
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar size={12} />
              {new Date(review.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>

          {/* 상품명 */}
          <p className="text-sm text-[#C4A882] font-semibold mb-2">{review.product_name}</p>

          {/* 제목 */}
          <h1 className="text-xl font-bold text-gray-900 mb-4 leading-snug">{review.title}</h1>

          {/* 구분선 */}
          <div className="border-t border-gray-100 mb-4" />

          {/* 본문 */}
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">{review.content}</p>

          {/* 작성자 + 좋아요 */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">{review.author_name}</span>
            <button onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                liked ? 'bg-[#EDE4D8] text-[#C4A882]' : 'bg-gray-100 text-gray-500 hover:bg-[#EDE4D8] hover:text-[#C4A882]'
              }`}>
              <ThumbsUp size={14} className={liked ? 'fill-[#C4A882]' : ''} />
              도움돼요 {review.likes}
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}
