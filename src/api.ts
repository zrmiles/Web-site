import type { User, Product, Order } from '../shared/types';

const API_BASE = '/api';

// Backward-compatible aliases — the wire shapes live in shared/types.ts now.
export type ApiUser = User;

// ====== Auth ======

export async function apiLogin(login: string, password: string): Promise<ApiUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ login, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка входа');
  return data;
}

export async function apiRegister(login: string, password: string, name: string, phone: string): Promise<ApiUser> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ login, password, name, phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка регистрации');
  return data;
}

export async function apiGetMe(): Promise<ApiUser> {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка проверки сессии');
  return data;
}

export async function apiLogout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
}

// ====== Products ======

export type ApiProduct = Product;

export async function apiGetProducts(): Promise<ApiProduct[]> {
  const res = await fetch(`${API_BASE}/products`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function apiGetProductsByIds(ids: number[]): Promise<ApiProduct[]> {
  if (ids.length === 0) return [];
  const res = await fetch(`${API_BASE}/products?ids=${ids.join(',')}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function apiGetProduct(idOrSlug: number | string): Promise<ApiProduct> {
  const res = await fetch(`${API_BASE}/products/${idOrSlug}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Product not found');
  return res.json();
}

export async function apiCreateProduct(data: Partial<ApiProduct>): Promise<ApiProduct> {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create product');
  return json;
}

export async function apiUpdateProduct(id: number, data: Partial<ApiProduct>): Promise<ApiProduct> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update product');
  return json;
}

export async function apiDeleteProduct(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to delete product');
}

// ====== Images ======

export async function apiUploadImages(productId: number, files: File[]): Promise<{ images: string[] }> {
  const formData = new FormData();
  files.forEach(file => formData.append('images', file));
  const res = await fetch(`${API_BASE}/products/${productId}/images`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to upload images');
  return json;
}

export async function apiDeleteImage(filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/images/${filename}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to delete image');
}

// ====== Orders ======

export type ApiOrder = Order;

export async function apiGetOrders(): Promise<ApiOrder[]> {
  const res = await fetch(`${API_BASE}/orders`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to fetch orders');
  return json;
}

export async function apiGetMyOrders(): Promise<ApiOrder[]> {
  const res = await fetch(`${API_BASE}/orders/mine`, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to fetch orders');
  return json;
}

export async function apiCreateOrder(order: {
  user: { name: string; phone: string; email: string; contactMethod: string };
  comment: string;
  items: { productId: number; title: string; qty: number; selectedOptions: { color: string; size: string } }[];
}): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(order),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create order');
  return json;
}

export async function apiUpdateOrderStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`${API_BASE}/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to update order status');
}

// ====== Favorites ======

export async function apiGetFavorites(): Promise<number[]> {
  const res = await fetch(`${API_BASE}/favorites`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch favorites');
  return res.json();
}

export async function apiAddFavorite(productId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/favorites/${productId}`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to add favorite');
}

export async function apiRemoveFavorite(productId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/favorites/${productId}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to remove favorite');
}

// Merge local (guest) favorites into the account, returns the merged set of ids.
export async function apiMergeFavorites(productIds: number[]): Promise<number[]> {
  const res = await fetch(`${API_BASE}/favorites`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ productIds }),
  });
  if (!res.ok) throw new Error('Failed to merge favorites');
  return res.json();
}
