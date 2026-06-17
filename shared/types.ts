// Wire DTOs shared between the Express API and the React client.
// Single source of truth — both sides import from here so the shapes can't drift.

export interface User {
  id: number;
  login: string;
  name: string;
  phone: string;
  role: string;
}

export interface Product {
  id: number;
  slug: string;
  title: string;
  shortDesc: string;
  description: string;
  category: string;
  images: string[];
  colors: string[];
  sizes: string[];
  related: number[];
  alsoWith: number[];
  createdAt?: string;
}

export interface OrderItem {
  productId: number;
  title: string;
  qty: number;
  selectedOptions: { color: string; size: string };
}

export interface Order {
  id: string;
  user: { name: string; phone: string; email: string; contactMethod: string };
  comment: string;
  items: OrderItem[];
  status: string;
  createdAt: string;
}

export interface CartItem {
  id: number;
  title: string;
  image: string;
  qty: number;
  selectedOptions: { color: string; size: string };
}

export type ToastType = 'success' | 'error' | 'info';
