'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function getSoldOutProducts(): Promise<Record<string, boolean>> {
  const { data } = await supabase
    .from('product_sold_out')
    .select('product_id')
    .eq('sold_out', true)
  const map: Record<string, boolean> = {}
  for (const row of data ?? []) {
    map[row.product_id] = true
  }
  return map
}

export async function isSoldOut(productId: string): Promise<boolean> {
  const { data } = await supabase
    .from('product_sold_out')
    .select('sold_out')
    .eq('product_id', productId)
    .single()
  return data?.sold_out ?? false
}

export async function toggleSoldOut(
  productId: string,
  soldOut: boolean
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('product_sold_out')
      .upsert({
        product_id: productId,
        sold_out: soldOut,
        updated_at: new Date().toISOString(),
      })
    if (error) throw error
    revalidatePath(`/product/${productId}`)
    revalidatePath(`/admin/products/${productId}`)
    revalidatePath('/products')
    revalidatePath('/admin')
    return { success: true }
  } catch {
    return { success: false }
  }
}
