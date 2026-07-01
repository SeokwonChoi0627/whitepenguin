'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { PenLine, Heart, MessageCircle, Search } from 'lucide-react'

const CATEGORIES = ['전체', '레시피', '결과물', '팁', '문의']

export interface Post {
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

export default function CommunityClient({ initialPosts }: { initialPosts: Post[] }) {
  const { data: session } = useSession()
  const [posts] = useState<Post[]>(initialPosts)
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = posts.filter((p) => {
    const matchCat = selectedCategory === '전체' || p.category === selectedCategory
    const matchSearch = searchQuery === '' ||
      p.title.includes(searchQuery) || p.content.includes(searchQuery)
    return matchCat && matchSearch
  })

  const categoryColor: Record<string, string> = {
    '레시피': 'bg-orange-50 text-orange-600',
    '결과물': 'bg-purple-50 text-purple-600',
    '팁': 'bg-blue-50 text-blue-600',
    '문의': 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">커뮤니티</h1>
          <p className="text-gray-500 text-sm">레시피를 나누고, 결과물을 자랑하세요</p>
        </div>
        {session ? (
          <Link href="/community/write"
            className="flex items-center gap-2 bg-[#333333] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a1a1a] transition-colors">
            <PenLine size={16} />
            글쓰기
          </Link>
        ) : (
          <Link href="/auth"
            className="flex items-center gap-2 border border-[#333333] text-[#333333] px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            <PenLine size={16} />
            로그인 후 작성
          </Link>
        )}
      </div>

      {/* 필터 + 검색 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat ? 'bg-[#333333] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="검색..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-4 py-1.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8]" />
        </div>
      </div>

      {/* 게시글 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-4xl mb-3">✏️</p>
          <p className="text-sm mb-4">
            {posts.length === 0 ? '아직 작성된 글이 없습니다.' : '검색 결과가 없습니다.'}
          </p>
          {session && posts.length === 0 && (
            <Link href="/community/write"
              className="inline-block bg-[#333333] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1a1a1a] transition-colors">
              첫 글 작성하기
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {filtered.map((post) => (
            <Link key={post.id} href={`/community/${post.id}`}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all block">
              <div className="h-40 bg-gradient-to-br from-[#F7F3EE] to-[#EDE4D8] flex items-center justify-center text-5xl overflow-hidden">
                {post.images && post.images.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  post.emoji
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor[post.category] || 'bg-gray-100 text-gray-500'}`}>
                    {post.category}
                  </span>
                  {post.tags?.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-xs text-gray-400">#{tag}</span>
                  ))}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">{post.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{post.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-medium text-gray-600">{post.author_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Heart size={12} /> {post.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={12} /> 0</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
