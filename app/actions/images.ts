'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function getProductImages(productId: string): Promise<string[]> {
  const { data } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', productId)
    .order('position')
  return data?.map((r) => r.url) ?? []
}

export async function getAllProductImages(): Promise<Record<string, string[]>> {
  const { data } = await supabase
    .from('product_images')
    .select('product_id, url')
    .order('position')
  const result: Record<string, string[]> = {}
  for (const row of data ?? []) {
    if (!result[row.product_id]) result[row.product_id] = []
    result[row.product_id].push(row.url)
  }
  return result
}

export async function uploadProductImage(
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
      .from('product-images')
      .upload(storagePath, file, { contentType: file.type })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath)

    const { data: existing } = await supabase
      .from('product_images')
      .select('position')
      .eq('product_id', productId)
      .order('position', { ascending: false })
      .limit(1)

    const position = existing && existing.length > 0 ? existing[0].position + 1 : 0

    const { error: dbError } = await supabase
      .from('product_images')
      .insert({ product_id: productId, url: publicUrl, position })
    if (dbError) throw dbError

    revalidatePath(`/product/${productId}`)
    revalidatePath(`/admin/products/${productId}`)

    return { success: true, path: publicUrl }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function deleteProductImage(
  productId: string,
  imagePath: string
): Promise<{ success: boolean }> {
  try {
    await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId)
      .eq('url', imagePath)

    if (imagePath.includes('supabase.co')) {
      const url = new URL(imagePath)
      const parts = url.pathname.split('/product-images/')
      if (parts.length > 1) {
        await supabase.storage.from('product-images').remove([parts[1]])
      }
    }

    revalidatePath(`/product/${productId}`)
    revalidatePath(`/admin/products/${productId}`)
    return { success: true }
  } catch {
    return { success: false }
  }
}
