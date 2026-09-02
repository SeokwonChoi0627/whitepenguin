// 발주서 장바구니 — localStorage 에 담기는 항목의 단일 출처.
// 상품 목록·카테고리·상품 상세가 모두 이 로직을 공유한다.

import type { CartItem, Product } from '@/lib/types'

export const CART_STORAGE_KEY = 'quoteCart'
export const MIN_QTY = 1
export const MAX_QTY = 999

export function clampQty(n: number): number {
  if (!Number.isFinite(n)) return MIN_QTY
  return Math.max(MIN_QTY, Math.min(MAX_QTY, Math.floor(n) || MIN_QTY))
}

/** 입력 문자열에서 숫자만 추려 수량으로 정규화한다 (빈 값이면 최소 수량) */
export function parseQtyInput(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits === '') return MIN_QTY
  return clampQty(parseInt(digits, 10))
}

export function readCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // 저장된 값이 손상된 경우 빈 장바구니로 시작한다
    return []
  }
}

export function writeCart(cart: CartItem[]): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
}

/**
 * 상품을 장바구니에 담는다. 이미 담긴 상품이면 수량을 더한다.
 * 기존 배열을 변형하지 않고 새 배열을 만들어 저장한다.
 */
export function addToCart(product: Product, quantity = MIN_QTY): CartItem[] {
  const qty = clampQty(quantity)
  const cart = readCart()
  const idx = cart.findIndex((item) => item.product.id === product.id)

  const next =
    idx >= 0
      ? cart.map((item, i) =>
          i === idx ? { ...item, quantity: clampQty(item.quantity + qty) } : item
        )
      : [...cart, { product, quantity: qty }]

  writeCart(next)
  return next
}
