'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ChevronDown, ChevronUp, Search, MessageCircle, CheckCircle, Clock, Lock, PenLine, X, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

const FAQ = [
  {
    q: '최소 주문 수량이 있나요?',
    a: '상품마다 최소 주문 수량이 다를 수 있습니다. 대부분의 상품은 1개부터 주문 가능하며, 대량 주문 시 별도 단가 협의가 가능합니다. 발주서 제출 후 담당자가 확인 연락 드립니다.',
  },
  {
    q: '세금계산서 발행이 가능한가요?',
    a: '네, 사업자 회원은 세금계산서 발행이 가능합니다. 발주서 작성 시 사업자등록증을 첨부해 주시면 담당자가 처리해 드립니다.',
  },
  {
    q: '배송은 얼마나 걸리나요?',
    a: '주문 확정 후 평균 2~3영업일 내 출고됩니다. 배송 완료까지 추가 1~2일이 소요될 수 있습니다.',
  },
  {
    q: '교환·반품이 가능한가요?',
    a: '상품 수령 후 7일 이내 교환·반품 신청이 가능합니다. 불량·오배송의 경우 전액 무료로 처리해 드립니다.',
  },
  {
    q: '대량 구매 시 할인이 되나요?',
    a: '네, 업체 규모와 주문 수량에 따라 맞춤 단가 협의가 가능합니다. 발주서를 제출하시거나 Q&A에 문의 남겨주시면 담당자가 연락드립니다.',
  },
  {
    q: '정기 발주 계약이 가능한가요?',
    a: '정기 발주 계약 업체에는 우선 재고 배정 및 추가 혜택을 제공하고 있습니다. 담당자에게 문의해 주세요.',
  },
]

const CATEGORIES = ['상품', '주문/결제', '배송', '기타']
const CATEGORY_COLORS: Record<string, string> = {
  '주문/결제': 'bg-blue-50 text-blue-600',
  '상품': 'bg-[#EDE4D8] text-[#A08860]',
  '배송': 'bg-green-50 text-green-600',
  '기타': 'bg-gray-100 text-gray-500',
}

interface QnaItem {
  id: string
  author_name: string
  author_email: string
  category: string
  title: string
  content: string
  is_private: boolean
  answered: boolean
  answer: string
  answer_date: string
  created_at: string
}

export default function QnaPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [tab, setTab] = useState<'faq' | 'qna'>('faq')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [openQna, setOpenQna] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [qnaList, setQnaList] = useState<QnaItem[]>([])
  const [showWriteForm, setShowWriteForm] = useState(false)
  const [form, setForm] = useState({ category: '상품', title: '', content: '', is_private: false, guest_name: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/qna').then(r => r.json()).then(d => { if (Array.isArray(d)) setQnaList(d) })
  }, [])

  const filteredQna = qnaList.filter((q) => {
    const matchCat = selectedCategory === '전체' || q.category === selectedCategory
    const matchSearch = searchQuery === '' || q.title.includes(searchQuery)
    return matchCat && matchSearch
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/qna', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || '등록에 실패했습니다.')
      setSubmitting(false)
      return
    }
    const newItem = await res.json()
    setQnaList([newItem, ...qnaList])
    setForm({ category: '상품', title: '', content: '', is_private: false, guest_name: '' })
    setShowWriteForm(false)
    setSubmitting(false)
    setTab('qna')
  }

  const isOwner = (item: QnaItem) =>
    user && (user.email === item.author_email)

  const canView = (item: QnaItem) =>
    !item.is_private || isOwner(item)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#333333] mb-1">Q&A</h1>
        <p className="text-gray-500 text-sm">궁금한 점을 남겨주시면 1영업일 내 답변드립니다.</p>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-8">
        <button onClick={() => setTab('faq')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'faq' ? 'border-[#333333] text-[#333333]' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}>
          자주 묻는 질문 (FAQ)
        </button>
        <button onClick={() => setTab('qna')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'qna' ? 'border-[#333333] text-[#333333]' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}>
          1:1 문의 ({qnaList.length})
        </button>
      </div>

      {/* ── FAQ ── */}
      {tab === 'faq' && (
        <div className="space-y-3">
          {FAQ.map((item, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-[#C4A882] font-black text-sm">Q</span>
                  <span className="font-medium text-[#333333] text-sm">{item.q}</span>
                </div>
                {openFaq === idx ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 flex gap-3">
                  <span className="text-[#333333] font-black text-sm flex-shrink-0">A</span>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 1:1 문의 ── */}
      {tab === 'qna' && (
        <>
          {/* 검색 + 필터 */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="제목으로 검색..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['전체', ...CATEGORIES].map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectedCategory === cat ? 'bg-[#333333] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>{cat}</button>
              ))}
            </div>
          </div>

          {/* 문의 작성 버튼 */}
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowWriteForm(!showWriteForm)}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${
                showWriteForm ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-[#333333] text-white hover:bg-[#1a1a1a]'
              }`}>
              {showWriteForm ? <><X size={15} /> 취소</> : <><PenLine size={15} /> 문의 작성</>}
            </button>
          </div>

          {/* 문의 작성 폼 */}
          {showWriteForm && (
            <form onSubmit={handleSubmit}
              className="bg-white border border-[#C4A882] rounded-2xl p-6 mb-5 space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle size={16} className="text-[#C4A882]" />
                문의 작성
              </h3>
              {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

              {/* 비로그인 시 작성자명 */}
              {!session && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">작성자명 *</label>
                  <input type="text" required placeholder="이름 또는 업체명을 입력하세요" value={form.guest_name}
                    onChange={e => setForm({ ...form, guest_name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]" />
                </div>
              )}

              {/* 카테고리 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">카테고리 *</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button key={cat} type="button" onClick={() => setForm({ ...form, category: cat })}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        form.category === cat ? 'bg-[#333333] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>{cat}</button>
                  ))}
                </div>
              </div>

              {/* 제목 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">제목 *</label>
                <input type="text" required placeholder="문의 제목을 입력하세요" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]" />
              </div>

              {/* 내용 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">내용 *</label>
                <textarea required rows={5} placeholder="문의 내용을 자세히 작성해주세요" value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882] resize-none" />
              </div>

              {/* 비공개 토글 */}
              <button type="button" onClick={() => setForm({ ...form, is_private: !form.is_private })}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  form.is_private
                    ? 'border-[#333333] bg-[#333333] text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
                }`}>
                {form.is_private ? <EyeOff size={15} /> : <Eye size={15} />}
                {form.is_private ? '비공개 문의' : '공개 문의'}
                <span className={`text-xs ml-1 ${form.is_private ? 'text-gray-300' : 'text-gray-400'}`}>
                  {form.is_private ? '나와 관리자만 볼 수 있어요' : '클릭하면 비공개로 전환돼요'}
                </span>
              </button>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowWriteForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                  취소
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-[#333333] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#1a1a1a] transition-colors disabled:opacity-50">
                  {submitting ? '등록 중...' : '문의 등록'}
                </button>
              </div>
            </form>
          )}

          {/* Q&A 목록 */}
          <div className="space-y-3">
            {filteredQna.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm">{qnaList.length === 0 ? '아직 등록된 문의가 없습니다.' : '검색 결과가 없습니다.'}</p>
              </div>
            ) : filteredQna.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => canView(item) && setOpenQna(openQna === item.id ? null : item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${canView(item) ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-500'}`}>
                    {item.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {item.is_private && <Lock size={12} className="text-gray-400 flex-shrink-0" />}
                      <p className="text-sm font-medium text-[#333333] truncate">
                        {canView(item) ? item.title : '비공개 문의입니다.'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.is_private && !isOwner(item) ? '비공개' : item.author_name} · {new Date(item.created_at).toLocaleDateString('ko-KR')} {new Date(item.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {item.answered
                    ? <span className="flex items-center gap-1 text-xs text-green-600 font-semibold flex-shrink-0"><CheckCircle size={13} />답변완료</span>
                    : <span className="flex items-center gap-1 text-xs text-orange-400 font-semibold flex-shrink-0"><Clock size={13} />답변대기</span>
                  }
                </button>

                {openQna === item.id && canView(item) && (
                  <div className="border-t border-gray-100">
                    <div className="px-5 py-4 bg-gray-50 flex gap-3">
                      <span className="text-[#C4A882] font-black text-sm flex-shrink-0">Q</span>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                    </div>
                    {item.answered && item.answer && (
                      <div className="px-5 py-4 flex gap-3">
                        <span className="text-[#333333] font-black text-sm flex-shrink-0">A</span>
                        <div>
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                          <p className="text-xs text-gray-400 mt-2">화이트펭귄 · {item.answer_date}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
