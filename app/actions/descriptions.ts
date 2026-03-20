'use server'

import { supabase } from '@/lib/supabase'
import { uploadToStorage } from '@/lib/storage'
import { revalidatePath } from 'next/cache'

export async function getProductDescription(productId: string): Promise<string> {
  const { data } = await supabase
    .from('product_descriptions')
    .select('content')
    .eq('product_id', productId)
    .single()
  return data?.content ?? ''
}

export async function saveProductDescription(
  productId: string,
  html: string
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('product_descriptions')
      .upsert({ product_id: productId, content: html, updated_at: new Date().toISOString() })
    if (error) throw error
    revalidatePath(`/product/${productId}`)
    revalidatePath(`/admin/products/${productId}`)
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function uploadDescriptionImage(
  formData: FormData
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const file = formData.get('image') as File
    const productId = formData.get('productId') as string
    if (!file || !productId) return { success: false, error: '파일 또는 상품 ID가 없습니다.' }

    const { publicUrl } = await uploadToStorage('product-desc-images', productId, file)
    return { success: true, path: publicUrl }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
