import { supabase } from '@/lib/supabase'
import ReviewsClient, { type Review } from './ReviewsClient'

// 30초마다 백그라운드 재생성(ISR). 방문자는 미리 렌더된 HTML을 즉시 받는다.
export const revalidate = 30

export default async function ReviewsPage() {
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })

  return <ReviewsClient initialReviews={(data as Review[]) ?? []} />
}
