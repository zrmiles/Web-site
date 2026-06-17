import React from 'react';
import ProductCard from './ProductCard';

interface Props {
  products: { id: number; slug?: string; title: string; shortDesc?: string; images: string[]; colors?: string[]; sizes?: string[]; category?: string }[];
}

export default function ProductGrid({ products }: Props) {
  return (
    <div className="product-grid">
      {products.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
