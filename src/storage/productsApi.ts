import {
  apiGetProducts,
  apiGetProduct,
  apiGetProductsByIds,
  type ApiProduct,
} from '../api';

// Re-export the product type for existing imports.
export type Product = ApiProduct;

// Lightweight in-memory cache so navigating between catalog/product pages
// doesn't refetch the whole list every time. Invalidated on a hard reload.
let listCache: Promise<Product[]> | null = null;

export function invalidateProductsCache() {
  listCache = null;
}

export function getProducts(): Promise<Product[]> {
  if (!listCache) {
    listCache = apiGetProducts().catch(err => {
      listCache = null; // don't cache failures
      throw err;
    });
  }
  return listCache;
}

export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  // Serve from the cached full list when it's already loaded.
  if (listCache) {
    const all = await listCache;
    const byId = new Map(all.map(p => [p.id, p]));
    if (ids.every(id => byId.has(id))) {
      return ids.map(id => byId.get(id)!);
    }
  }
  return apiGetProductsByIds(ids);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  try {
    return await apiGetProduct(slug);
  } catch {
    return undefined;
  }
}

export async function getProductById(id: number): Promise<Product | undefined> {
  try {
    return await apiGetProduct(id);
  } catch {
    return undefined;
  }
}
