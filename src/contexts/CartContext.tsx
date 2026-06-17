import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CartItem } from '../types';
import * as storage from '../storage/cartStorage';

interface CartContextValue {
  items: CartItem[];
  count: number;
  addItem: (product: { id: number; title: string; images?: string[] }, options: { color: string; size: string }) => void;
  updateItem: (index: number, qty: number) => void;
  removeItem: (index: number) => void;
  clear: () => void;
  refresh: () => void;
}

const CartContext = createContext<CartContextValue>({
  items: [], count: 0,
  addItem: () => {}, updateItem: () => {}, removeItem: () => {}, clear: () => {}, refresh: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(storage.getCartItems());
  const [count, setCount] = useState(storage.getCartCount());

  const refresh = useCallback(() => {
    setItems(storage.getCartItems());
    setCount(storage.getCartCount());
  }, []);

  const addItem = useCallback((product: { id: number; title: string; images?: string[] }, options: { color: string; size: string }) => {
    storage.addToCart(product, options);
    refresh();
  }, [refresh]);

  const updateItem = useCallback((index: number, qty: number) => {
    storage.updateCartItem(index, qty);
    refresh();
  }, [refresh]);

  const removeItem = useCallback((index: number) => {
    storage.removeCartItem(index);
    refresh();
  }, [refresh]);

  const clear = useCallback(() => {
    storage.clearCart();
    refresh();
  }, [refresh]);

  return (
    <CartContext.Provider value={{ items, count, addItem, updateItem, removeItem, clear, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
