import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import { ArrowRight, CheckCircle, Package, FileText, Phone, Heart, ThumbsUp, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STEPS = [
  { icon: <Package size={24} />, step: '01', title: '회원가입', desc: '네이버·카카오로 간편 가입' },
  { icon: <Package size={24} />, step: '02', title: '상품 선택', desc: '카탈로그에서 원하는 상품 담기' },
  { icon: <FileText size={24} />, step: '03', title: '발주서 작성', desc: '업체 정보 입력 후 제출' },
  { icon: <Phone size={24} />, step: '04', title: '담당자 확인', desc: '1영업일 내 견적 확인 연락' },
]

const CATEGORY_COLOR: Record<string, string> = {
  '레시피': 'bg-orange-50 text-orange-600',
  '결과물': 'bg-purple-50 text-purple-600',
  '팁': 'bg-blue-50 text-blue-600',
  '문의': 'bg-gray-100 text-gray-500',
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={13} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  )
}

export default async function HomePage() {
  const [{ data: communityPosts }, { data: reviews }] = await Promise.all([
    supabase
      .from('community_posts')
      .select('id, title, author_name, category, likes, emoji, images')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('reviews')
      .select('id, title, content, author_name, category, rating, product_name, likes, images')
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  return (
    <div>
      {/* ── 히어로 ─────────────────────────────────── */}
      <section className="bg-[#333333] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2 mb-6">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/70 text-sm px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-[#C4A882] rounded-full animate-pulse" />
                B2B · B2C 전문 도매 플랫폼
              </div>
              <Link href="/community" className="inline-flex items-center gap-2 bg-[#C4A882]/20 hover:bg-[#C4A882]/30 text-[#C4A882] text-sm px-3 py-1 rounded-full transition-colors">
                <span className="w-2 h-2 bg-[#C4A882] rounded-full" />
                베이킹 커뮤니티
              </Link>
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">
              베이킹 전문도구의<br />
              <span className="text-[#C4A882]">B2B, B2C 파트너</span>
            </h1>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              반느통부터 제과틀, 소모품까지.<br />
              카페·베이커리·제과 업체를 위한 전문 도매 공급.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products"
                className="flex items-center gap-2 bg-[#C4A882] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#A08860] transition-colors">
                상품 보기 <ArrowRight size={18} />
              </Link>
              <Link href="/quote"
                className="flex items-center gap-2 border border-white/30 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors">
                발주서 작성
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 카테고리 ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-semibold text-[#C4A882] mb-1">PRODUCT CATEGORIES</p>
            <h2 className="text-2xl font-bold text-[#333333]">전체 카테고리</h2>
          </div>
          <Link href="/products" className="text-sm text-[#333333] font-medium hover:underline flex items-center gap-1">
            전체 보기 <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Link key={cat.key} href={`/category/${cat.key}`}
              className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-[#C4A882] hover:shadow-md transition-all">
              <div className="text-3xl mb-3">{cat.emoji}</div>
              <h3 className="font-bold text-[#333333] mb-1">{cat.label}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{cat.description}</p>
            </Link>
          ))}
          <Link href="/products"
            className="group bg-[#F7F3EE] border border-dashed border-[#C4A882]/40 rounded-xl p-5 hover:border-[#C4A882] hover:bg-[#EDE4D8] transition-all flex flex-col items-center justify-center text-center">
            <ArrowRight size={24} className="text-[#C4A882] mb-2" />
            <span className="text-sm font-medium text-[#A08860]">전체 상품 보기</span>
          </Link>
        </div>
      </section>

      {/* ── 발주 프로세스 ─────────────────────────────── */}
      <section className="bg-[#F7F3EE] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-[#C4A882] mb-1">HOW TO ORDER</p>
            <h2 className="text-2xl font-bold text-[#333333]">발주 방법</h2>
            <p className="text-gray-500 mt-2">간단한 4단계로 발주를 완료하세요</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="relative bg-white rounded-xl p-6 border border-gray-200 text-center">
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-[#C4A882]/50 z-10" size={20} />
                )}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#EDE4D8] text-[#A08860] mb-4 mx-auto">
                  {s.icon}
                </div>
                <div className="text-xs font-bold text-[#C4A882] mb-1">STEP {s.step}</div>
                <h3 className="font-bold text-[#333333] mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── B2B 혜택 ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-[#333333] rounded-2xl p-8 md:p-12 text-white overflow-hidden relative">
          <div className="grid md:grid-cols-2 gap-8 items-stretch relative z-10">
            <div>
              <p className="text-[#C4A882] text-base font-semibold mb-2">WHY WHITE PENGUIN</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-5">B2B 거래 혜택</h2>
              <ul className="space-y-3">
                {[
                  '전문 담당자 1:1 견적 상담',
                  '업체 규모별 맞춤 단가 협의',
                  '정기 발주 시 우선 재고 배정',
                  '세금계산서 발행 가능',
                  '빠른 배송 및 안전 포장',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-gray-300 text-base">
                    <CheckCircle size={17} className="text-[#C4A882] flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-end justify-end gap-3 h-full pr-2">
              <div style={{ height: '160px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translateX(144px) translateY(24px)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-icon.png"
                  alt=""
                  className="brightness-0 invert opacity-80"
                  style={{ height: '320px', width: 'auto' }}
                />
              </div>
              <Link href="/auth"
                className="inline-block bg-[#C4A882] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#A08860] transition-colors">
                지금 시작하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 커뮤니티 최근 게시물 ─────────────────────── */}
      <section className="bg-[#F7F3EE] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-sm font-semibold text-[#C4A882] mb-1">COMMUNITY</p>
              <h2 className="text-2xl font-bold text-[#333333]">레시피 & 결과물 자랑</h2>
            </div>
            <Link href="/community" className="text-sm text-[#333333] font-medium hover:underline flex items-center gap-1">
              더 보기 <ArrowRight size={14} />
            </Link>
          </div>

          {!communityPosts || communityPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">✏️</p>
              <p className="text-sm mb-4">아직 작성된 글이 없습니다.</p>
              <Link href="/community"
                className="inline-block border border-[#333333] text-[#333333] text-sm font-medium px-5 py-2 rounded-xl hover:bg-[#EDE4D8] transition-colors">
                커뮤니티 가기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {communityPosts.map((post) => (
                <Link key={post.id} href={`/community/${post.id}`}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="h-40 bg-gradient-to-br from-[#F7F3EE] to-[#EDE4D8] flex items-center justify-center overflow-hidden">
                    {post.images && post.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl">{post.emoji || '📝'}</span>
                    )}
                  </div>
                  <div className="p-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLOR[post.category] || 'bg-gray-100 text-gray-500'}`}>
                      {post.category}
                    </span>
                    <h3 className="font-semibold text-[#333333] mt-2 mb-3 text-sm leading-snug line-clamp-2">
                      {post.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{post.author_name}</span>
                      <span className="flex items-center gap-1"><Heart size={11} /> {post.likes ?? 0}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 리뷰 최근 게시물 ─────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-semibold text-[#C4A882] mb-1">REVIEWS</p>
            <h2 className="text-2xl font-bold text-[#333333]">고객 리뷰</h2>
          </div>
          <Link href="/reviews" className="text-sm text-[#333333] font-medium hover:underline flex items-center gap-1">
            더 보기 <ArrowRight size={14} />
          </Link>
        </div>

        {!reviews || reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">⭐</p>
            <p className="text-sm mb-4">아직 작성된 리뷰가 없습니다.</p>
            <Link href="/reviews"
              className="inline-block border border-[#333333] text-[#333333] text-sm font-medium px-5 py-2 rounded-xl hover:bg-[#F7F3EE] transition-colors">
              리뷰 보기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {reviews.map((review) => (
              <Link key={review.id} href={`/reviews/${review.id}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all block">
                {review.images && review.images.length > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={review.images[0]} alt="" className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <StarRow rating={review.rating} />
                    <span className="text-xs bg-[#EDE4D8] text-[#A08860] px-2 py-0.5 rounded-full font-medium">
                      {review.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#C4A882] font-medium mb-1">{review.product_name}</p>
                  <h3 className="font-semibold text-[#333333] text-sm leading-snug mb-2 line-clamp-1">{review.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{review.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-medium text-gray-500">{review.author_name}</span>
                    <span className="flex items-center gap-1"><ThumbsUp size={11} /> {review.likes ?? 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── 쇼핑몰 바로가기 ─────────────────────────── */}
      <section className="bg-[#333333] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-[#C4A882] mb-1">SHOP WITH US</p>
          <h2 className="text-2xl font-bold text-white mb-2">쇼핑몰 바로가기</h2>
          <p className="text-gray-400 text-sm mb-8">원하시는 채널에서 화이트펭귄을 만나보세요</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://smartstore.naver.com/whitepenguin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#03C75A] text-white font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/></svg>
              스마트스토어
            </a>
            <a
              href="https://shop.coupang.com/whitepenguin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#C4A882] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#A08860] transition-colors w-full sm:w-auto justify-center"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
              쿠팡
            </a>
            <a
              href="https://www.instagram.com/157bluebird"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#dc2743] text-white font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              인스타그램
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
