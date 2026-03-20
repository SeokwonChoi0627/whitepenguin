'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Heart, Calendar, Tag } from 'lucide-react'
import Link from 'next/link'

interface Post {
  id: string
  title: string
  content: string
  author_name: string
  category: string
  created_at: string
  likes: number
  emoji: string
  tags: string[]
  images: string[]
}

const categoryColor: Record<string, string> = {
  '레시피': 'bg-orange-50 text-orange-600',
  '결과물': 'bg-purple-50 text-purple-600',
  '팁': 'bg-blue-50 text-blue-600',
  '문의': 'bg-gray-100 text-gray-500',
}

export default function CommunityDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    fetch(`/api/community/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) router.push('/community')
        else setPost(data)
      })
      .finally(() => setLoading(false))
  }, [id, router])

  const handleLike = async () => {
    if (liked || !post) return
    setLiked(true)
    setPost({ ...post, likes: post.likes + 1 })
    await fetch(`/api/community/${id}/like`, { method: 'POST' })
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>
  }
  if (!post) return null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/community" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColor[post.category] || 'bg-gray-100 text-gray-500'}`}>
          {post.category}
        </span>
      </div>

      <article className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* 이미지 */}
        {post.images && post.images.length > 0 ? (
          <div className={`grid gap-1 ${post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {post.images.map((src, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={idx} src={src} alt=""
                className={`w-full object-cover ${
                  post.images.length === 1 ? 'h-72' :
                  post.images.length === 2 ? 'h-52' :
                  idx === 0 && post.images.length === 3 ? 'h-52 col-span-2' : 'h-52'
                }`} />
            ))}
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-[#F7F3EE] to-[#EDE4D8] flex items-center justify-center text-6xl">
            {post.emoji}
          </div>
        )}

        <div className="p-6">
          {/* 제목 */}
          <h1 className="text-xl font-bold text-gray-900 mb-3 leading-snug">{post.title}</h1>

          {/* 작성자 / 날짜 */}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-4 pb-4 border-b border-gray-100">
            <span className="font-semibold text-gray-600">{post.author_name}</span>
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {new Date(post.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>

          {/* 본문 */}
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">{post.content}</p>

          {/* 태그 */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-6">
              <Tag size={13} className="text-gray-400" />
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs text-[#C4A882] bg-[#F7F3EE] px-2 py-0.5 rounded-full">#{tag}</span>
              ))}
            </div>
          )}

          {/* 좋아요 */}
          <div className="flex justify-end">
            <button onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                liked ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
              }`}>
              <Heart size={15} className={liked ? 'fill-red-500' : ''} />
              도움돼요 {post.likes}
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}
