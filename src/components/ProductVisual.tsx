import React from 'react';

type VisualKind = 'boxes' | 'bags' | 'film' | 'supplies';

const CATEGORY_LABELS: Record<string, string> = {
  korobki: 'Коробки',
  pakety: 'Пакеты',
  plenki: 'Плёнки',
  raskhodnye: 'Расходные',
};

export function productCategoryLabel(category?: string) {
  if (!category) return 'Упаковка';
  return CATEGORY_LABELS[category] || category;
}

function productVisualKind(category?: string, title = ''): VisualKind {
  const value = `${category || ''} ${title}`.toLowerCase();
  if (value.includes('paket') || value.includes('пакет')) return 'bags';
  if (value.includes('plenk') || value.includes('плён') || value.includes('плен')) return 'film';
  if (value.includes('skotch') || value.includes('скотч') || value.includes('бумаг') || value.includes('наполн')) return 'supplies';
  return 'boxes';
}

interface ProductVisualProps {
  title: string;
  category?: string;
  className?: string;
}

export default function ProductVisual({ title, category, className = '' }: ProductVisualProps) {
  const kind = productVisualKind(category, title);

  return (
    <div className={`product-visual product-visual--${kind}${className ? ` ${className}` : ''}`} aria-hidden="true">
      <span>{productCategoryLabel(category)}</span>
    </div>
  );
}
