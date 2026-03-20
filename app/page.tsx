import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import { ArrowRight, CheckCircle, Package, FileText, Phone } from 'lucide-react'

const SAMPLE_POSTS = [
  { id: '1', title: '반느통으로 만든 르뱅 캄파뉴 — 크러스트가 달라요', author: '베이커리 달빛', category: '레시피', likes: 42, emoji: '🍞' },
  { id: '2', title: '고양이발바닥틀로 만든 말차 피낭시에 후기', author: '카페 온도', category: '결과물', likes: 38, emoji: '🍵' },
  { id: '3', title: '초미니타르트틀 — 단체 납품용으로 최고입니다', author: '구움과자 공방', category: '결과물', likes: 27, emoji: '🥧' },
]

const STEPS = [
  { icon: <Package size={24} />, step: '01', title: '회원가입', desc: '네이버·카카오로 간편 가입' },
  { icon: <Package size={24} />, step: '02', title: '상품 선택', desc: '카탈로그에서 원하는 상품 담기' },
  { icon: <FileText size={24} />, step: '03', title: '발주서 작성', desc: '업체 정보 입력 후 제출' },
  { icon: <Phone size={24} />, step: '04', title: '담당자 확인', desc: '1영업일 내 견적 확인 연락' },
]

export default function HomePage() {
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
              {/* 펭귄 — 중앙 정렬로 상하 여백 클리핑 */}
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

      {/* ── 커뮤니티 미리보기 ─────────────────────────── */}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SAMPLE_POSTS.map((post) => (
              <Link key={post.id} href={`/community/${post.id}`}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="h-36 bg-[#EDE4D8] flex items-center justify-center text-5xl">
                  {post.emoji}
                </div>
                <div className="p-4">
                  <span className="text-xs font-medium text-[#A08860] bg-[#EDE4D8] px-2 py-0.5 rounded-full">
                    {post.category}
                  </span>
                  <h3 className="font-semibold text-[#333333] mt-2 mb-3 text-sm leading-snug">
                    {post.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{post.author}</span>
                    <span>♥ {post.likes}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
