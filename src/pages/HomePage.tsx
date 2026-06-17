import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, type Product } from '../storage/productsApi';
import ProductGrid from '../components/ProductGrid';
import SkeletonGrid from '../components/SkeletonGrid';
import { productCategoryLabel } from '../components/ProductVisual';
import { BoxIcon, CheckIcon, SearchIcon, TruckIcon } from '../components/Icons';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(products.map(product => product.category).filter(Boolean)));
  const query = search.trim().toLowerCase();
  const visibleProducts = products
    .filter(product => selectedCategory === 'all' || product.category === selectedCategory)
    .filter(product => !query
      || product.title.toLowerCase().includes(query)
      || product.shortDesc?.toLowerCase().includes(query)
      || product.description?.toLowerCase().includes(query));

  return (
    <div className="container home-shop home-shop--front">
      <section className="home-market" aria-labelledby="homeCatalogTitle">
        <div className="home-market__copy">
          <span className="home-market__eyebrow">Опт · от 1 паллеты · доставка по РФ</span>
          <h1 id="homeCatalogTitle">Упаковка для бизнеса без лишних согласований</h1>
          <p>
            Коробки, пакеты, плёнка и расходные материалы. Подберём тираж и рассчитаем цену по заявке.
          </p>
          <div className="home-market__actions">
            <Link to="/catalog" className="btn btn--primary btn--lg">Перейти в каталог</Link>
            <Link to="/request" className="btn btn--outline btn--lg">Оставить заявку</Link>
          </div>
          <div className="home-market__proof" aria-label="Преимущества поставки">
            <span><TruckIcon /> Быстрая отгрузка со склада</span>
            <span><CheckIcon /> Контроль качества</span>
            <span><BoxIcon /> Оптовые условия</span>
          </div>
        </div>
        <div className="home-market__visual" aria-hidden="true">
          <img src="/assets/packstore-hero-b2b.jpg" alt="" />
        </div>
      </section>

      <section className="home-catalog-head" aria-label="Каталог продукции">
        <div>
          <h2>Каталог продукции</h2>
          <p>{products.length || 0} товаров в {categories.length || 0} категориях</p>
        </div>
        <div className="home-catalog-search">
          <SearchIcon />
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Поиск по каталогу"
            aria-label="Поиск по каталогу"
          />
        </div>
      </section>

      <div className="home-category-rail" aria-label="Категории товаров">
        <button
          type="button"
          className={selectedCategory === 'all' ? 'is-active' : ''}
          onClick={() => setSelectedCategory('all')}
        >
          Все товары
        </button>
        {categories.map(category => (
          <button
            type="button"
            key={category}
            className={selectedCategory === category ? 'is-active' : ''}
            onClick={() => setSelectedCategory(category)}
          >
            {productCategoryLabel(category)}
          </button>
        ))}
        <Link to="/catalog">Расширенный каталог</Link>
      </div>

      <section className="home-shop__products">
        {loading ? <SkeletonGrid count={8} /> : <ProductGrid products={visibleProducts.slice(0, 12)} />}
      </section>

      {!loading && visibleProducts.length === 0 && (
        <div className="catalog-empty">
          <p className="catalog-empty__text">Ничего не найдено. Попробуйте изменить запрос или категорию.</p>
        </div>
      )}

      {visibleProducts.length > 12 && (
        <div className="home-shop__more">
          <Link to="/catalog" className="btn btn--outline btn--lg">Смотреть все {visibleProducts.length} товаров</Link>
        </div>
      )}
    </div>
  );
}
