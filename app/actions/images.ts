'use server'

import { supabase } from '@/lib/supabase'
import { uploadToStorage, extractStoragePath } from '@/lib/storage'
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

    const { publicUrl, storagePath } = await uploadToStorage('product-images', productId, file)

    const { error: dbError } = await supabase
      .from('product_images')
      .insert({ product_id: productId, url: publicUrl, position: Date.now() })

    if (dbError) {
      await supabase.storage.from('product-images').remove([storagePath])
      throw dbError
    }

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

    const storagePath = extractStoragePath(imagePath, 'product-images')
    if (storagePath) {
      await supabase.storage.from('product-images').remove([storagePath])
    }

    revalidatePath(`/product/${productId}`)
    revalidatePath(`/admin/products/${productId}`)
    return { success: true }
  } catch {
    return { success: false }
  }
}
