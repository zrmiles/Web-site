import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../contexts/FavoritesContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { HeartIcon } from './Icons';
import ProductVisual, { productCategoryLabel } from './ProductVisual';

const PLACEHOLDER = '/assets/placeholder.svg';

interface Props {
  product: { id: number; slug?: string; title: string; shortDesc?: string; images: string[]; colors?: string[]; sizes?: string[]; category?: string };
}

export default function ProductCard({ product }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  const [imgSrc, setImgSrc] = useState(product.images?.[0] || PLACEHOLDER);
  const { addItem } = useCart();
  const { showToast } = useToast();

  const productUrl = `/catalog/${product.slug || product.id}`;
  const requestUrl = `/request?product=${encodeURIComponent(product.slug || String(product.id))}`;

  const handleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isNow = toggle(product.id);
    showToast(isNow ? 'Добавлено в избранное' : 'Удалено из избранного', 'success');
  };

  const handleAddCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, { color: product.colors?.[0] || '', size: product.sizes?.[0] || '' });
    showToast('Товар добавлен в корзину', 'success');
  };

  return (
    <div className="product-card">
      <div className="product-card__img-wrap">
        {product.images?.length ? (
          <img
            className="product-card__img"
            src={imgSrc}
            alt={product.title}
            loading="lazy"
            onError={() => setImgSrc(PLACEHOLDER)}
          />
        ) : (
          <ProductVisual title={product.title} category={product.category} />
        )}
        <button
          className={`product-card__fav${fav ? ' is-active' : ''}`}
          onClick={handleFav}
          aria-label="В избранное"
        >
          <HeartIcon />
        </button>
      </div>
      <div className="product-card__body">
        <div className="product-card__meta">
          <span>{productCategoryLabel(product.category)}</span>
          {product.sizes?.[0] && <span>{product.sizes[0]}</span>}
        </div>
        <div className="product-card__title">
          <Link to={productUrl}>{product.title}</Link>
        </div>
        <div className="product-card__desc">{product.shortDesc}</div>
        {(product.colors?.length || 0) > 0 && (
          <div className="product-card__chips" aria-label="Варианты товара">
            {product.colors?.slice(0, 2).map(color => <span key={color}>{color}</span>)}
            {(product.colors?.length || 0) > 2 && <span>ещё {(product.colors?.length || 0) - 2}</span>}
          </div>
        )}
        <Link to={requestUrl} className="product-card__price product-card__price-btn">
          Цена по запросу
        </Link>
      </div>
      <div className="product-card__actions">
        <Link to={productUrl} className="btn btn--outline">Подробнее</Link>
        <button className="btn btn--primary" onClick={handleAddCart}>В корзину</button>
      </div>
    </div>
  );
}
