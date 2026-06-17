import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, type Product } from '../storage/productsApi';
import { useFavorites } from '../contexts/FavoritesContext';
import ProductGrid from '../components/ProductGrid';
import { HeartIcon } from '../components/Icons';

export default function FavoritesPage() {
  const { ids: favIds } = useFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const favProducts = favIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];

  if (loading) return <div className="container"><p>Загрузка...</p></div>;

  if (favProducts.length === 0) {
    return (
      <div className="container">
        <div className="page-hero">
          <h1 className="page-hero__title">Избранное</h1>
          <p className="page-hero__subtitle">Товары, которые вам понравились</p>
        </div>
        <div className="favorites-empty">
          <div className="favorites-empty__icon"><HeartIcon /></div>
          <div className="favorites-empty__title">Здесь пока пусто</div>
          <p className="favorites-empty__text">Добавляйте товары в избранное, нажимая на сердечко</p>
          <Link to="/catalog" className="btn btn--primary btn--lg">Перейти в каталог</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-hero">
        <h1 className="page-hero__title">Избранное</h1>
        <p className="page-hero__subtitle">Товары, которые вам понравились</p>
      </div>
      <ProductGrid products={favProducts} />
    </div>
  );
}
