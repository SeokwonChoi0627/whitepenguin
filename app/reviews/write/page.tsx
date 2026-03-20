'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Star, ChevronLeft, ImagePlus, X } from 'lucide-react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'

const CATEGORIES = ['제과틀', '반느통', '커버천', '쿠키틀', '푸딩틀', '도구', '소모품']

export default function ReviewWritePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [form, setForm] = useState({
    productName: '', category: '제과틀', rating: 5, title: '', content: '',
  })
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newImages = [...images, ...files].slice(0, 4)
    setImages(newImages)
    setPreviews(newImages.map((f) => URL.createObjectURL(f)))
    e.target.value = ''
  }

  const removeImage = (idx: number) => {
    const newImages = images.filter((_, i) => i !== idx)
    setImages(newImages)
    setPreviews(newImages.map((f) => URL.createObjectURL(f)))
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth')
  }, [status, router])

  if (status === 'loading' || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 이미지 업로드
    const imageUrls: string[] = []
    for (const file of images) {
      const ext = file.name.split('.').pop()
      const fileName = `review_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabaseBrowser.storage
        .from('community-images')
        .upload(fileName, file, { contentType: file.type })
      if (uploadError) {
        setError('이미지 업로드에 실패했습니다: ' + uploadError.message)
        setLoading(false)
        return
      }
      const { data: { publicUrl } } = supabaseBrowser.storage
        .from('community-images')
        .getPublicUrl(fileName)
      imageUrls.push(publicUrl)
    }

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, images: imageUrls }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '등록에 실패했습니다.')
      setLoading(false)
      return
    }
    router.push('/reviews')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/reviews" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Star size={20} className="text-yellow-400 fill-yellow-400" />
          리뷰 작성
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
        )}

        {/* 카테고리 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">카테고리 *</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button key={cat} type="button" onClick={() => setForm({ ...form, category: cat })}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  form.category === cat ? 'bg-[#333333] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 상품명 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">상품명 *</label>
          <input type="text" placeholder="구매하신 상품명을 입력하세요" required value={form.productName}
            onChange={(e) => setForm({ ...form, productName: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]" />
        </div>

        {/* 별점 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">별점 *</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setForm({ ...form, rating: s })}
                className="text-2xl transition-transform hover:scale-110">
                <Star size={28} className={s <= form.rating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-200 fill-gray-200'} />
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-500 self-center">{form.rating}점</span>
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">리뷰 제목 *</label>
          <input type="text" placeholder="한 줄로 요약해주세요" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]" />
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">리뷰 내용 *</label>
          <textarea placeholder="상품 사용 후기를 솔직하게 작성해주세요" required rows={6} value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882] resize-none" />
        </div>

        {/* 사진 첨부 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            사진 첨부 <span className="font-normal text-gray-400">(최대 4장, 선택)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {previews.map((src, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(idx)}
                  className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70">
                  <X size={12} />
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-[#C4A882] hover:bg-[#F7F3EE] rounded-xl cursor-pointer transition-colors text-gray-400 hover:text-[#C4A882]">
                <ImagePlus size={20} />
                <span className="text-xs mt-1">추가</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/reviews"
            className="flex-1 text-center border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            취소
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-[#333333] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#1a1a1a] transition-colors disabled:opacity-50">
            {loading ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
