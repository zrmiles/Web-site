import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProductBySlug, getProductById, getProductsByIds, type Product } from '../storage/productsApi';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { HeartIcon } from '../components/Icons';
import ProductVisual, { productCategoryLabel } from '../components/ProductVisual';
import ProductGrid from '../components/ProductGrid';
import './ProductPage.css';

const ProductPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedList, setRelatedList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { isFavorite, toggle } = useFavorites();

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setSelectedImage(0);
    setRelatedList([]);

    (async () => {
      const numericId = Number(slug);
      const prod = (await getProductBySlug(slug))
        || (Number.isInteger(numericId) && numericId > 0 ? await getProductById(numericId) : undefined);
      if (cancelled) return;
      setProduct(prod || null);
      setSelectedColor(prod?.colors?.[0] || '');
      setSelectedSize(prod?.sizes?.[0] || '');
      if (prod) {
        // Fetch only the linked products instead of the whole catalog.
        const linkedIds = Array.from(new Set([...(prod.related || []), ...(prod.alsoWith || [])]));
        const linked = await getProductsByIds(linkedIds);
        if (!cancelled) setRelatedList(linked);
      }
    })()
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <div className="product-page"><p>Загрузка...</p></div>;
  if (!product) return <div className="product-page"><p>Товар не найден</p></div>;

  const fav = isFavorite(product.id);
  const relatedProducts = relatedList.filter(p => product.related?.includes(p.id));
  const alsoWithProducts = relatedList.filter(p => product.alsoWith?.includes(p.id));
  const requestUrl = `/request?product=${encodeURIComponent(product.slug || String(product.id))}&color=${encodeURIComponent(selectedColor)}&size=${encodeURIComponent(selectedSize)}`;

  const addToCart = () => {
    addItem(
      { id: product.id, title: product.title, images: product.images },
      { color: selectedColor || product.colors?.[0] || '', size: selectedSize || product.sizes?.[0] || '' }
    );
    showToast('Товар добавлен в корзину', 'success');
  };

  const handleFav = () => {
    const isNow = toggle(product.id);
    showToast(isNow ? 'Добавлено в избранное' : 'Удалено из избранного', 'success');
  };

  return (
    <div className="product-page">
      <div className="product-main">
        <div className="product-gallery">
          {product.images && product.images.length > 0 ? (
            <>
              <div className="product-gallery-main">
                <img src={product.images[selectedImage]} alt={product.title} />
              </div>
              {product.images.length > 1 && (
                <div className="product-gallery-thumbs">
                  {product.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`${product.title} ${i + 1}`}
                      className={i === selectedImage ? 'active' : ''}
                      onClick={() => setSelectedImage(i)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <ProductVisual title={product.title} category={product.category} className="product-visual--detail" />
          )}
        </div>

        <div className="product-info">
          <h1>{product.title}</h1>
          {product.category && <span className="product-category">{productCategoryLabel(product.category)}</span>}
          <p className="product-short-desc">{product.shortDesc}</p>

          {product.colors && product.colors.length > 0 && (
            <div className="product-option">
              <label>Цвет:</label>
              <div className="product-option-buttons">
                {product.colors.map(color => (
                  <button
                    key={color}
                    className={selectedColor === color ? 'active' : ''}
                    onClick={() => setSelectedColor(color)}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.sizes && product.sizes.length > 0 && (
            <div className="product-option">
              <label>Размер:</label>
              <div className="product-option-buttons">
                {product.sizes.map(size => (
                  <button
                    key={size}
                    className={selectedSize === size ? 'active' : ''}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="product-actions">
            <Link className="product-price-request" to={requestUrl}>
              Запросить цену
            </Link>
            <button className="product-add-cart" onClick={addToCart}>
              Добавить в корзину
            </button>
            <button
              className={`product-fav-btn${fav ? ' is-active' : ''}`}
              onClick={handleFav}
              aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
              title={fav ? 'Убрать из избранного' : 'В избранное'}
            >
              <HeartIcon />
            </button>
          </div>

          {product.description && (
            <div className="product-description">
              <h3>Описание</h3>
              <p>{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="product-related">
          <h2>Похожие товары</h2>
          <ProductGrid products={relatedProducts} />
        </div>
      )}

      {alsoWithProducts.length > 0 && (
        <div className="product-related">
          <h2>С этим также берут</h2>
          <ProductGrid products={alsoWithProducts} />
        </div>
      )}
    </div>
  );
};

export default ProductPage;
