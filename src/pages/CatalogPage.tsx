import React, { useState, useEffect, useMemo } from 'react';
import { getProducts, type Product } from '../storage/productsApi';
import ProductGrid from '../components/ProductGrid';
import { BoxIcon, SearchIcon, XIcon } from '../components/Icons';
import './CatalogPage.css';

const CATEGORY_LABELS: Record<string, string> = {
  korobki: 'Коробки',
  lotki: 'Лотки',
  plenki: 'Плёнки',
  rashodniki: 'Расходники',
  raskhodnye: 'Расходники',
  pakety: 'Пакеты',
};

function categoryLabel(raw: string): string {
  return CATEGORY_LABELS[raw] || raw;
}

const CatalogPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return cats.sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  }, [products]);

  const countByCategory = useMemo(() => {
    const map: Record<string, number> = { all: products.length };
    for (const p of products) {
      if (p.category) map[p.category] = (map[p.category] || 0) + 1;
    }
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.shortDesc && p.shortDesc.toLowerCase().includes(q))
      );
    }
    return result;
  }, [products, selectedCategory, search]);

  if (loading) {
    return (
      <div className="catalog-page">
        <h1>Каталог</h1>
        <div className="catalog-skeleton">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="catalog-skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-page">
      <h1>Каталог</h1>

      <div className="catalog-toolbar">
        <div className="catalog-search">
          <SearchIcon className="catalog-search__icon" />
          <input
            className="catalog-search__input"
            type="text"
            placeholder="Поиск товаров..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="catalog-search__clear" onClick={() => setSearch('')} aria-label="Очистить">
              <XIcon />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="catalog-filters">
            <button
              className={`filter-btn${selectedCategory === 'all' ? ' active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              Все <span className="filter-btn__count">{countByCategory.all}</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-btn${selectedCategory === cat ? ' active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {categoryLabel(cat)} <span className="filter-btn__count">{countByCategory[cat] || 0}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {search && (
        <p className="catalog-results-count">
          {filtered.length === 0 ? 'Ничего не найдено' : `Найдено: ${filtered.length}`}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="catalog-empty">
          <div className="catalog-empty__icon"><BoxIcon /></div>
          <p className="catalog-empty__text">
            {search ? 'Попробуйте изменить запрос или сбросить фильтры' : 'Товары пока не добавлены'}
          </p>
          {(search || selectedCategory !== 'all') && (
            <button className="btn btn--outline" onClick={() => { setSearch(''); setSelectedCategory('all'); }}>
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <ProductGrid products={filtered} />
      )}
    </div>
  );
};

export default CatalogPage;
