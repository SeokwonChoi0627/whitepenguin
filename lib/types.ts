export interface Product {
  id: string
  name: string
  category: CategoryKey
  size?: string
  holes?: string
  holeSize?: string
  code: string
  note?: string
  priceVatIncluded: number
  imageColor?: string // placeholder color for product card
  image?: string      // thumbnail path e.g. '/thumbnails/파일명.png'
}

export type CategoryKey =
  | 'banneton'
  | 'baking-mold'
  | 'cookie-cutter'
  | 'pudding-mold'
  | 'cover-cloth'
  | 'tools'
  | 'consumables'

export interface Category {
  key: CategoryKey
  label: string
  emoji: string
  description: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface QuoteForm {
  companyName: string
  representative: string
  businessNumber: string
  phone: string
  email: string
  address: string
  deliveryDate: string
  notes: string
  items: CartItem[]
}

export interface Post {
  id: string
  title: string
  author: string
  category: 'recipe' | 'showcase' | 'tip' | 'inquiry'
  createdAt: string
  likes: number
  comments: number
  thumbnail?: string
  content: string
  tags: string[]
}
