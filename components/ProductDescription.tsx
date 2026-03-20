interface Props {
  html: string
}

export default function ProductDescription({ html }: Props) {
  const isEmpty = !html || html === '<p></p>' || html.trim() === ''
  if (isEmpty) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-[#333333]">상품 상세</h2>
      </div>
      <div
        className="p-6 desc-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
