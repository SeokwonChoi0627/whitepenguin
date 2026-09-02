'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ImagePlus, Save, Eye, EyeOff } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { compressImage } from '@/lib/imageCompress'
import { describePopupStatus, isPopupVisible, type PopupSettings } from '@/lib/popup'
import { RETURN_PHOTO_BUCKET } from '@/lib/returns'

export default function AdminPopupPage() {
  const [settings, setSettings] = useState<PopupSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 관리자 전체 설정 조회는 POST (GET 은 공개 노출용이라 최소 정보만 준다)
      const res = await fetch('/api/popup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '설정을 불러오지 못했습니다.')
      setSettings(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const patch = (changes: Partial<PopupSettings>) =>
    setSettings((prev) => (prev ? { ...prev, ...changes } : prev))

  const uploadImage = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const compressed = await compressImage(file, { maxDimension: 1200 })
      const ext = compressed.name.split('.').pop() || 'jpg'
      const fileName = `popup_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabaseBrowser.storage
        .from(RETURN_PHOTO_BUCKET)
        .upload(fileName, compressed, { contentType: compressed.type })
      if (upErr) throw new Error('이미지 업로드 실패: ' + upErr.message)
      const { data: { publicUrl } } = supabaseBrowser.storage
        .from(RETURN_PHOTO_BUCKET)
        .getPublicUrl(fileName)
      patch({ image_url: publicUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/popup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_enabled: settings.is_enabled,
          image_url: settings.image_url,
          link_href: settings.link_href,
          alt_text: settings.alt_text,
          starts_on: settings.starts_on,
          ends_on: settings.ends_on,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '저장에 실패했습니다.')
      setSettings(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#333333]">팝업 배너 관리</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              메인 페이지 팝업의 이미지·링크·노출 기간을 설정합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm mb-5">
            {error}
          </div>
        )}

        {loading || !settings ? (
          <p className="text-center text-gray-400 text-sm py-16">불러오는 중...</p>
        ) : (
          <form onSubmit={save} className="space-y-5">
            {/* 현재 상태 */}
            <div className={`rounded-2xl px-5 py-4 flex items-center gap-3 ${
              isPopupVisible(settings)
                ? 'bg-[#333333] text-white'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}>
              <span className="flex-shrink-0">
                {isPopupVisible(settings) ? <Eye size={20} /> : <EyeOff size={20} />}
              </span>
              <div>
                <p className="text-xs opacity-60">현재 상태</p>
                <p className="font-bold text-sm mt-0.5">{describePopupStatus(settings)}</p>
              </div>
            </div>

            {/* 켜기 / 끄기 */}
            <section className="bg-white rounded-2xl shadow-sm px-5 py-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_enabled}
                  onChange={(e) => patch({ is_enabled: e.target.checked })}
                  className="mt-0.5 accent-[#333333] w-4 h-4"
                />
                <span>
                  <span className="block text-sm font-bold text-gray-900">팝업 사용</span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    끄면 기간과 관계없이 팝업이 표시되지 않습니다.
                  </span>
                </span>
              </label>
            </section>

            {/* 배너 이미지 */}
            <section className="bg-white rounded-2xl shadow-sm px-5 py-4">
              <h2 className="text-sm font-bold text-gray-900 mb-3">배너 이미지</h2>
              {settings.image_url ? (
                <div className="space-y-2.5">
                  <div className="rounded-xl overflow-hidden border border-gray-200 max-w-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.image_url} alt="현재 배너" className="block w-full" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-2 rounded-lg hover:border-[#C4A882] hover:text-[#C4A882] transition-colors disabled:opacity-50"
                    >
                      <ImagePlus size={13} />
                      {uploading ? '업로드 중...' : '이미지 교체'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 hover:border-[#C4A882] hover:bg-[#F7F3EE] text-gray-400 hover:text-[#C4A882] rounded-xl py-10 transition-colors disabled:opacity-50"
                >
                  <ImagePlus size={22} />
                  <span className="text-sm">{uploading ? '업로드 중...' : '배너 이미지 선택'}</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadImage(f)
                  e.target.value = ''
                }}
              />
              <p className="text-xs text-gray-400 mt-2.5">
                세로로 긴 이미지가 잘 어울립니다. 업로드 시 자동으로 압축됩니다.
              </p>
            </section>

            {/* 링크 · 대체 텍스트 */}
            <section className="bg-white rounded-2xl shadow-sm px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  클릭 시 이동할 곳<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={settings.link_href}
                  onChange={(e) => patch({ link_href: e.target.value })}
                  placeholder="/products"
                  className={inputClass}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  사이트 내부 경로만 됩니다. 예: <code className="text-gray-500">/products</code> ·{' '}
                  <code className="text-gray-500">/auth</code> ·{' '}
                  <code className="text-gray-500">/quote</code>
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  대체 텍스트
                </label>
                <input
                  type="text"
                  value={settings.alt_text}
                  onChange={(e) => patch({ alt_text: e.target.value })}
                  placeholder="오픈기념 무료배송 이벤트"
                  maxLength={100}
                  className={inputClass}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  이미지가 안 뜰 때 대신 보이는 문구입니다. 화면 낭독기도 이 문구를 읽습니다.
                </p>
              </div>
            </section>

            {/* 노출 기간 */}
            <section className="bg-white rounded-2xl shadow-sm px-5 py-4">
              <h2 className="text-sm font-bold text-gray-900 mb-3">노출 기간</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">시작일</label>
                  <input
                    type="date"
                    value={settings.starts_on ?? ''}
                    onChange={(e) => patch({ starts_on: e.target.value || null })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">종료일</label>
                  <input
                    type="date"
                    value={settings.ends_on ?? ''}
                    onChange={(e) => patch({ ends_on: e.target.value || null })}
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 bg-[#F7F3EE] rounded-lg px-3.5 py-2.5 mt-3 leading-relaxed">
                <strong>종료일 당일까지</strong> 표시되고, 다음 날부터 자동으로 사라집니다.
                비워두면 기간 제한이 없습니다.
              </p>
            </section>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-[#333333] text-white font-bold py-3 rounded-xl hover:bg-[#1a1a1a] transition-colors disabled:opacity-40"
              >
                <Save size={16} />
                {saving ? '저장 중...' : '저장하기'}
              </button>
              {saved && (
                <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                  저장했습니다
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 text-center">
              저장 즉시 메인 페이지에 반영됩니다. 재배포는 필요 없습니다.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]'
