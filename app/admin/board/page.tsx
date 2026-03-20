'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Trash2, Check, X, ChevronLeft, ImagePlus } from 'lucide-react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'

const ADMIN_EMAILS = ['swchoi157@naver.com', 'dragon0627@naver.com']
const POST_CATEGORIES = ['레시피', '결과물', '팁', '문의']
const REVIEW_CATEGORIES = ['제과틀', '반느통', '커버천', '쿠키틀', '푸딩틀', '도구', '소모품']

interface Post {
  id: string; title: string; content: string; author_name: string; category: string; created_at: string; likes: number; images: string[]
}
interface Review {
  id: string; title: string; content: string; author_name: string; product_name: string; category: string; rating: number; created_at: string; likes: number; images: string[]
}
interface QnaItem {
  id: string; title: string; content: string; author_name: string; category: string; is_private: boolean; answered: boolean; answer: string; created_at: string
}

// ── 이미지 편집 컴포넌트 ──
function ImageEditor({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const [uploading, setUploading] = useState(false)

  const handleAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 4) {
      alert('사진은 최대 4장까지 첨부할 수 있습니다.')
      e.target.value = ''
      return
    }
    setUploading(true)
    const newUrls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const fileName = `admin_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabaseBrowser.storage
        .from('community-images')
        .upload(fileName, file, { contentType: file.type })
      if (!error) {
        const { data: { publicUrl } } = supabaseBrowser.storage.from('community-images').getPublicUrl(fileName)
        newUrls.push(publicUrl)
      }
    }
    onChange([...images, ...newUrls])
    setUploading(false)
    e.target.value = ''
  }

  const handleRemove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-2">사진 <span className="font-normal text-gray-400">({images.length}/4)</span></p>
      <div className="flex gap-2 flex-wrap">
        {images.map((src, idx) => (
          <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => handleRemove(idx)}
              className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80">
              <X size={11} />
            </button>
          </div>
        ))}
        {images.length < 4 && (
          <label className={`w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-colors flex-shrink-0 ${
            uploading ? 'border-gray-200 text-gray-300' : 'border-gray-300 hover:border-[#C4A882] hover:bg-[#F7F3EE] text-gray-400 hover:text-[#C4A882]'
          }`}>
            <ImagePlus size={18} />
            <span className="text-xs mt-1">{uploading ? '업로드중' : '추가'}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleAdd} disabled={uploading} />
          </label>
        )}
      </div>
    </div>
  )
}

function BoardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'posts' | 'reviews' | 'qna'>(
    searchParams.get('tab') === 'reviews' ? 'reviews' : searchParams.get('tab') === 'qna' ? 'qna' : 'posts'
  )
  const [posts, setPosts] = useState<Post[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [qnaList, setQnaList] = useState<QnaItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [postForm, setPostForm] = useState({ title: '', content: '', category: '', images: [] as string[] })
  const [reviewForm, setReviewForm] = useState({ title: '', content: '', category: '', product_name: '', rating: 5, images: [] as string[] })
  const [answerForm, setAnswerForm] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const user = session?.user as any

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth'); return }
    if (status === 'authenticated' && !ADMIN_EMAILS.includes(user?.email)) router.push('/')
  }, [status, user, router])

  useEffect(() => {
    fetch('/api/community').then(r => r.json()).then(d => { if (Array.isArray(d)) setPosts(d) })
    fetch('/api/reviews').then(r => r.json()).then(d => { if (Array.isArray(d)) setReviews(d) })
    fetch('/api/qna').then(r => r.json()).then(d => { if (Array.isArray(d)) setQnaList(d) })
  }, [])

  if (status === 'loading' || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>
  }
  if (!ADMIN_EMAILS.includes(user?.email)) return null

  // ── 커뮤니티 ──
  const startEditPost = (p: Post) => {
    setEditingId(p.id)
    setPostForm({ title: p.title, content: p.content, category: p.category, images: p.images || [] })
    setConfirmId(null)
  }
  const savePost = async (id: string) => {
    setSaving(true)
    const res = await fetch(`/api/community/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postForm),
    })
    if (res.ok) { const u = await res.json(); setPosts(posts.map(p => p.id === id ? { ...p, ...u } : p)); setEditingId(null) }
    setSaving(false)
  }
  const deletePost = async (id: string) => {
    const res = await fetch(`/api/community/${id}`, { method: 'DELETE' })
    if (res.ok) { setPosts(posts.filter(p => p.id !== id)); setConfirmId(null) }
  }

  // ── 리뷰 ──
  const startEditReview = (r: Review) => {
    setEditingId(r.id)
    setReviewForm({ title: r.title, content: r.content, category: r.category, product_name: r.product_name, rating: r.rating, images: r.images || [] })
    setConfirmId(null)
  }
  const saveReview = async (id: string) => {
    setSaving(true)
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reviewForm),
    })
    if (res.ok) { const u = await res.json(); setReviews(reviews.map(r => r.id === id ? { ...r, ...u } : r)); setEditingId(null) }
    setSaving(false)
  }
  const deleteReview = async (id: string) => {
    const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' })
    if (res.ok) { setReviews(reviews.filter(r => r.id !== id)); setConfirmId(null) }
  }

  // ── Q&A ──
  const startAnswerQna = (q: QnaItem) => {
    setEditingId(q.id)
    setAnswerForm(q.answer || '')
    setConfirmId(null)
  }
  const saveAnswer = async (id: string) => {
    setSaving(true)
    const today = new Date().toLocaleDateString('ko-KR')
    const res = await fetch(`/api/qna/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: answerForm, answered: answerForm.trim().length > 0, answer_date: today }),
    })
    if (res.ok) { const u = await res.json(); setQnaList(qnaList.map(q => q.id === id ? { ...q, ...u } : q)); setEditingId(null) }
    setSaving(false)
  }
  const deleteQna = async (id: string) => {
    const res = await fetch(`/api/qna/${id}`, { method: 'DELETE' })
    if (res.ok) { setQnaList(qnaList.filter(q => q.id !== id)); setConfirmId(null) }
  }

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[#333333]">게시글·리뷰·Q&A 관리</h1>
              <p className="text-sm text-gray-500 mt-0.5">수정은 연필 아이콘, 삭제는 휴지통 아이콘을 누르세요.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* 탭 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['posts', 'reviews', 'qna'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setEditingId(null); setConfirmId(null) }}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t ? 'bg-[#333333] text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}>
              {t === 'posts' ? `커뮤니티 게시글 (${posts.length})` : t === 'reviews' ? `상품 리뷰 (${reviews.length})` : `Q&A 문의 (${qnaList.length})`}
            </button>
          ))}
        </div>

        {/* ── 커뮤니티 게시글 ── */}
        {tab === 'posts' && (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {editingId === post.id ? (
                  <div className="p-5 space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {POST_CATEGORIES.map(cat => (
                        <button key={cat} type="button" onClick={() => setPostForm({ ...postForm, category: cat })}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            postForm.category === cat ? 'bg-[#333333] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>{cat}</button>
                      ))}
                    </div>
                    <input value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
                      placeholder="제목" />
                    <textarea value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })}
                      rows={5} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882] resize-none"
                      placeholder="내용" />
                    <ImageEditor
                      images={postForm.images}
                      onChange={imgs => setPostForm({ ...postForm, images: imgs })}
                    />
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={() => setEditingId(null)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                        <X size={14} /> 취소
                      </button>
                      <button onClick={() => savePost(post.id)} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#333333] text-white text-sm font-semibold hover:bg-[#1a1a1a] disabled:opacity-50">
                        <Check size={14} /> 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 flex items-start gap-4">
                    {post.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{post.category}</span>
                        <span className="text-xs text-gray-400 font-medium">{post.author_name}</span>
                        <span className="text-xs text-gray-300">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                        {post.images?.length > 0 && <span className="text-xs text-gray-300">사진 {post.images.length}장</span>}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm line-clamp-1">{post.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{post.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEditPost(post)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="수정">
                        <Pencil size={15} />
                      </button>
                      {confirmId === post.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deletePost(post.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600">삭제 확인</button>
                          <button onClick={() => setConfirmId(null)}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">취소</button>
                        </div>
                      ) : (
                        <button onClick={() => { setConfirmId(post.id); setEditingId(null) }}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="삭제">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {posts.length === 0 && <p className="text-center text-gray-400 py-12 text-sm">게시글이 없습니다.</p>}
          </div>
        )}

        {/* ── 상품 리뷰 ── */}
        {tab === 'reviews' && (
          <div className="space-y-3">
            {reviews.map(review => (
              <div key={review.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {editingId === review.id ? (
                  <div className="p-5 space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {REVIEW_CATEGORIES.map(cat => (
                        <button key={cat} type="button" onClick={() => setReviewForm({ ...reviewForm, category: cat })}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            reviewForm.category === cat ? 'bg-[#333333] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>{cat}</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input value={reviewForm.product_name} onChange={e => setReviewForm({ ...reviewForm, product_name: e.target.value })}
                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
                        placeholder="상품명" />
                      <select value={reviewForm.rating} onChange={e => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C4A882] bg-white">
                        {[5,4,3,2,1].map(s => <option key={s} value={s}>{s}점 ({'⭐'.repeat(s)})</option>)}
                      </select>
                    </div>
                    <input value={reviewForm.title} onChange={e => setReviewForm({ ...reviewForm, title: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
                      placeholder="리뷰 제목" />
                    <textarea value={reviewForm.content} onChange={e => setReviewForm({ ...reviewForm, content: e.target.value })}
                      rows={5} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882] resize-none"
                      placeholder="리뷰 내용" />
                    <ImageEditor
                      images={reviewForm.images}
                      onChange={imgs => setReviewForm({ ...reviewForm, images: imgs })}
                    />
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={() => setEditingId(null)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                        <X size={14} /> 취소
                      </button>
                      <button onClick={() => saveReview(review.id)} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#333333] text-white text-sm font-semibold hover:bg-[#1a1a1a] disabled:opacity-50">
                        <Check size={14} /> 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 flex items-start gap-4">
                    {review.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={review.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs bg-[#EDE4D8] text-[#A08860] px-2 py-0.5 rounded-full">{review.category}</span>
                        <span className="text-xs text-[#C4A882] font-medium">{review.product_name}</span>
                        <span className="text-xs text-gray-400">{review.author_name}</span>
                        <span className="text-xs text-yellow-500">{'⭐'.repeat(review.rating)}</span>
                        <span className="text-xs text-gray-300">{new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
                        {review.images?.length > 0 && <span className="text-xs text-gray-300">사진 {review.images.length}장</span>}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm line-clamp-1">{review.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{review.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEditReview(review)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="수정">
                        <Pencil size={15} />
                      </button>
                      {confirmId === review.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteReview(review.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600">삭제 확인</button>
                          <button onClick={() => setConfirmId(null)}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">취소</button>
                        </div>
                      ) : (
                        <button onClick={() => { setConfirmId(review.id); setEditingId(null) }}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="삭제">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {reviews.length === 0 && <p className="text-center text-gray-400 py-12 text-sm">리뷰가 없습니다.</p>}
          </div>
        )}

        {/* ── Q&A 문의 ── */}
        {tab === 'qna' && (
          <div className="space-y-3">
            {qnaList.map(qna => (
              <div key={qna.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {editingId === qna.id ? (
                  <div className="p-5 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">질문 내용</p>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">{qna.content}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">답변 작성</label>
                      <textarea value={answerForm} onChange={e => setAnswerForm(e.target.value)}
                        rows={5} placeholder="답변을 입력하세요"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882] resize-none" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                        <X size={14} /> 취소
                      </button>
                      <button onClick={() => saveAnswer(qna.id)} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#333333] text-white text-sm font-semibold hover:bg-[#1a1a1a] disabled:opacity-50">
                        <Check size={14} /> 답변 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{qna.category}</span>
                        {qna.is_private && <span className="text-xs text-gray-400">🔒 비공개</span>}
                        <span className="text-xs text-gray-400">{qna.author_name}</span>
                        <span className="text-xs text-gray-300">{new Date(qna.created_at).toLocaleDateString('ko-KR')}</span>
                        {qna.answered
                          ? <span className="text-xs text-green-600 font-semibold">✓ 답변완료</span>
                          : <span className="text-xs text-orange-400 font-semibold">답변대기</span>}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm line-clamp-1">{qna.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{qna.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startAnswerQna(qna)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="답변">
                        <Pencil size={15} />
                      </button>
                      {confirmId === qna.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteQna(qna.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600">삭제 확인</button>
                          <button onClick={() => setConfirmId(null)}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">취소</button>
                        </div>
                      ) : (
                        <button onClick={() => { setConfirmId(qna.id); setEditingId(null) }}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="삭제">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {qnaList.length === 0 && <p className="text-center text-gray-400 py-12 text-sm">문의가 없습니다.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminBoardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <BoardContent />
    </Suspense>
  )
}
