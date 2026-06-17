import { CartItem } from '../types';

const CART_KEY = 'pack_store_cart';

export function getCartItems(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(product: { id: number; title: string; images?: string[] }, options: { color: string; size: string }) {
  const items = getCartItems();
  const existing = items.find(
    i => i.id === product.id && i.selectedOptions.color === options.color && i.selectedOptions.size === options.size
  );
  if (existing) {
    existing.qty += 1;
  } else {
    items.push({
      id: product.id,
      title: product.title,
      image: product.images?.[0] || '/assets/placeholder.svg',
      qty: 1,
      selectedOptions: { color: options.color, size: options.size },
    });
  }
  saveCart(items);
}

export function updateCartItem(index: number, qty: number) {
  const items = getCartItems();
  if (items[index]) {
    items[index].qty = Math.max(1, qty);
    saveCart(items);
  }
}

export function removeCartItem(index: number) {
  const items = getCartItems();
  items.splice(index, 1);
  saveCart(items);
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function getCartCount(): number {
  return getCartItems().reduce((sum, i) => sum + i.qty, 0);
}
