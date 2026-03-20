'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import TiptapImage from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import { useState, useRef, useCallback } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Minus, ImageIcon, Loader2, Check,
} from 'lucide-react'

// fontSize를 TextStyle 마크에 추가하는 확장
const FontSizeExtension = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize || null,
        renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
      },
    }
  },
})

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36, 48]

interface Props {
  entityId: string
  initialContent: string
  title?: string
  previewHref?: string
  saveAction: (id: string, html: string) => Promise<{ success: boolean }>
  uploadImageAction: (formData: FormData) => Promise<{ success: boolean; path?: string; error?: string }>
}

export default function RichTextEditor({
  entityId,
  initialContent,
  title = '상세 설명',
  previewHref,
  saveAction,
  uploadImageAction,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontSizeExtension,
      Color,
      Underline,
      TiptapImage.configure({ inline: false }),
      Placeholder.configure({ placeholder: '내용을 입력하세요.' }),
      Highlight.configure({ multicolor: true }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'tiptap' },
    },
  })

  const handleSave = async () => {
    if (!editor) return
    setSaving(true)
    const result = await saveAction(entityId, editor.getHTML())
    setSaving(false)
    if (result.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !editor) return
    setUploadingImg(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('productId', entityId)
      const result = await uploadImageAction(fd)
      if (result.success && result.path) {
        editor.chain().focus().setImage({ src: result.path }).run()
      }
    }
    setUploadingImg(false)
    e.target.value = ''
  }

  const btn = useCallback(
    (active: boolean) =>
      `p-1.5 rounded transition-colors ${
        active
          ? 'bg-[#e8e8e8] text-gray-900'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`,
    []
  )

  const currentStyle = editor?.isActive('heading', { level: 1 })
    ? 'h1'
    : editor?.isActive('heading', { level: 2 })
    ? 'h2'
    : editor?.isActive('heading', { level: 3 })
    ? 'h3'
    : 'p'

  const currentFontSize =
    editor?.getAttributes('textStyle').fontSize?.replace('px', '') ?? '15'

  const applyStyle = (val: string) => {
    if (!editor) return
    if (val === 'p') editor.chain().focus().setParagraph().run()
    else editor.chain().focus().setHeading({ level: Number(val.replace('h', '')) as 1|2|3 }).run()
  }

  const applyFontSize = (val: string) =>
    editor?.chain().focus().setMark('textStyle', { fontSize: `${val}px` }).run()

  const textColor = (editor?.getAttributes('textStyle').color as string) || '#333333'
  const hlColor = (editor?.getAttributes('highlight').color as string) || '#fef08a'

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#f7f7f7] border-b border-gray-200">
        <div>
          <span className="font-semibold text-[#333] text-sm">{title}</span>
          <p className="text-[11px] text-gray-400 mt-0.5">페이지 하단에 표시됩니다.</p>
        </div>
        <div className="flex items-center gap-2">
          {previewHref && (
            <a
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-[#333] transition-colors px-3 py-1.5 border border-gray-200 rounded-lg bg-white"
            >
              미리보기 →
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              saved ? 'bg-green-500 text-white' : 'bg-[#03c75a] hover:bg-[#02b350] text-white disabled:opacity-60'
            }`}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
            {saved ? '저장됨!' : saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* ── 삽입 도구 바 ── */}
      <div className="flex items-center gap-0.5 px-4 py-1.5 bg-[#f7f7f7] border-b border-gray-200">
        <button
          onClick={() => imgInputRef.current?.click()}
          disabled={uploadingImg}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-50 transition-colors min-w-[52px]"
        >
          {uploadingImg ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
          <span className="text-[10px] leading-none">사진</span>
        </button>
        <button
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors min-w-[52px]"
        >
          <Minus size={16} />
          <span className="text-[10px] leading-none">구분선</span>
        </button>
      </div>

      {/* ── 서식 도구 바 ── */}
      <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-gray-200 flex-wrap">
        {/* 단락 스타일 */}
        <select
          value={currentStyle}
          onChange={(e) => applyStyle(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 h-7 cursor-pointer focus:outline-none focus:border-gray-400"
        >
          <option value="p">본문</option>
          <option value="h1">제목 1</option>
          <option value="h2">제목 2</option>
          <option value="h3">제목 3</option>
        </select>

        {/* 폰트 크기 */}
        <select
          value={currentFontSize}
          onChange={(e) => applyFontSize(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1.5 bg-white text-gray-700 w-14 h-7 cursor-pointer focus:outline-none focus:border-gray-400"
        >
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Bold */}
        <button onClick={() => editor?.chain().focus().toggleBold().run()}
          className={btn(!!editor?.isActive('bold'))} title="굵게 (Ctrl+B)">
          <Bold size={14} />
        </button>
        {/* Italic */}
        <button onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={btn(!!editor?.isActive('italic'))} title="기울임 (Ctrl+I)">
          <Italic size={14} />
        </button>
        {/* Underline */}
        <button onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={btn(!!editor?.isActive('underline'))} title="밑줄 (Ctrl+U)">
          <UnderlineIcon size={14} />
        </button>
        {/* Strikethrough */}
        <button onClick={() => editor?.chain().focus().toggleStrike().run()}
          className={btn(!!editor?.isActive('strike'))} title="취소선">
          <Strikethrough size={14} />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 글자 색 */}
        <label
          className={`${btn(false)} cursor-pointer relative`}
          title="글자 색"
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold leading-none" style={{ color: textColor }}>T</span>
            <div className="w-3.5 h-1 rounded-sm" style={{ backgroundColor: textColor }} />
          </div>
          <input type="color" value={textColor}
            onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        </label>

        {/* 형광펜 */}
        <label
          className={`${btn(!!editor?.isActive('highlight'))} cursor-pointer relative`}
          title="형광펜"
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold leading-none text-gray-700">T</span>
            <div className="w-3.5 h-1 rounded-sm" style={{ backgroundColor: hlColor }} />
          </div>
          <input type="color" value={hlColor}
            onChange={(e) => editor?.chain().focus().setHighlight({ color: e.target.value }).run()}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        </label>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 정렬 */}
        <button onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          className={btn(!!editor?.isActive({ textAlign: 'left' }))} title="왼쪽 정렬">
          <AlignLeft size={14} />
        </button>
        <button onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          className={btn(!!editor?.isActive({ textAlign: 'center' }))} title="가운데 정렬">
          <AlignCenter size={14} />
        </button>
        <button onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          className={btn(!!editor?.isActive({ textAlign: 'right' }))} title="오른쪽 정렬">
          <AlignRight size={14} />
        </button>
        <button onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
          className={btn(!!editor?.isActive({ textAlign: 'justify' }))} title="양쪽 정렬">
          <AlignJustify size={14} />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* 목록 */}
        <button onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={btn(!!editor?.isActive('bulletList'))} title="글머리 기호">
          <List size={14} />
        </button>
        <button onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={btn(!!editor?.isActive('orderedList'))} title="번호 목록">
          <ListOrdered size={14} />
        </button>
      </div>

      {/* ── 에디터 영역 ── */}
      <div className="bg-[#f0f0f0] p-6 md:p-10">
        <div className="bg-white max-w-3xl mx-auto shadow-sm min-h-[600px]">
          <EditorContent editor={editor} />
        </div>
      </div>

      <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
    </div>
  )
}
