'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function getProductThumbnails(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('product_thumbnails')
    .select('product_id, url')
  const result: Record<string, string> = {}
  for (const row of data ?? []) {
    result[row.product_id] = row.url
  }
  return result
}

export async function uploadProductThumbnail(
  formData: FormData
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const file = formData.get('image') as File
    const productId = formData.get('productId') as string
    if (!file || !productId) return { success: false, error: '파일 또는 상품 ID가 없습니다.' }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${Date.now()}.${ext}`
    const storagePath = `${productId}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from('product-thumbnails-custom')
      .upload(storagePath, file, { contentType: file.type })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('product-thumbnails-custom')
      .getPublicUrl(storagePath)

    const { error: dbError } = await supabase
      .from('product_thumbnails')
      .upsert({ product_id: productId, url: publicUrl })
    if (dbError) throw dbError

    revalidatePath(`/product/${productId}`)
    revalidatePath('/products')
    revalidatePath('/')
    revalidatePath(`/admin/products/${productId}`)
    revalidatePath('/admin')

    return { success: true, path: publicUrl }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
