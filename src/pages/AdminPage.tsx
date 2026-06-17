import React, { useState, useEffect, useRef } from 'react';
import { apiGetOrders, apiUpdateOrderStatus, apiGetProducts, apiCreateProduct, apiUpdateProduct, apiDeleteProduct, apiUploadImages, apiDeleteImage, ApiOrder, ApiProduct } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { invalidateProductsCache } from '../storage/productsApi';
import Drawer from '../components/Drawer';
import { BoxIcon, EditIcon, EyeIcon, SearchIcon, TrashIcon, UploadIcon, XIcon } from '../components/Icons';
import { formatDate, statusLabel } from '../utils/format';

const PLACEHOLDER = '/assets/placeholder.svg';

function statusBadge(status: string) {
  return <span className={`badge ${statusLabel(status)}`}>{status}</span>;
}

type AdminTab = 'catalog' | 'orders';
type OrderFilter = 'all' | 'Новая' | 'В работе' | 'Закрыта';

const emptyForm = {
  title: '',
  slug: '',
  shortDesc: '',
  description: '',
  colors: '',
  sizes: '',
  category: '',
  related: '',
  alsoWith: '',
};

export default function AdminPage() {
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<AdminTab>('orders');

  // Orders
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

  // Catalog
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([apiGetProducts(), apiGetOrders()])
      .then(([loadedProducts, loadedOrders]) => {
        if (cancelled) return;
        setProducts(loadedProducts);
        setOrders(loadedOrders);
      })
      .catch(() => {
        if (!cancelled) showToast('Не удалось загрузить данные панели', 'error');
      });

    return () => { cancelled = true; };
  }, [showToast]);

  const refreshData = async () => {
    const [p, o] = await Promise.all([apiGetProducts().catch(() => []), apiGetOrders().catch(() => [])]);
    setProducts(p); setOrders(o);
  };

  // Filter orders
  const oq = orderSearch.toLowerCase().trim();
  const ordersByStatus = {
    all: orders.length,
    'Новая': orders.filter(o => o.status === 'Новая').length,
    'В работе': orders.filter(o => o.status === 'В работе').length,
    'Закрыта': orders.filter(o => o.status === 'Закрыта').length,
  };
  const filteredOrders = orders
    .filter(order => orderFilter === 'all' || order.status === orderFilter)
    .filter(order => {
      if (!oq) return true;
      return order.id.toLowerCase().includes(oq)
        || order.user.phone.toLowerCase().includes(oq)
        || order.user.name.toLowerCase().includes(oq)
        || order.user.email.toLowerCase().includes(oq)
        || order.items.some(item => item.title.toLowerCase().includes(oq));
    });

  // === Auth ===
  const handleLogout = async () => {
    await logout();
    showToast('Вы вышли из панели администратора', 'info');
  };

  // === Orders ===
  const handleStatusChange = async (id: string, status: string) => {
    await apiUpdateOrderStatus(id, status);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setSelectedOrder(prev => prev && prev.id === id ? { ...prev, status } : prev);
    showToast('Статус обновлён', 'success');
  };

  const handleOrderDetail = (order: ApiOrder) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  // === Catalog form ===
  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setPendingFiles([]);
    setExistingImages([]);
    setRemovedImages([]);
    setShowForm(true);
  };

  const openEditForm = (p: ApiProduct) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      shortDesc: p.shortDesc,
      description: p.description,
      colors: p.colors.join(', '),
      sizes: p.sizes.join(', '),
      category: p.category,
      related: p.related.join(', '),
      alsoWith: p.alsoWith.join(', '),
    });
    setExistingImages([...p.images]);
    setRemovedImages([]);
    setPendingFiles([]);
    setFormErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setPendingFiles([]);
    setExistingImages([]);
    setRemovedImages([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) {
        showToast(`Файл ${file.name} больше 10 МБ`, 'error');
        continue;
      }
      newFiles.push(file);
    }
    setPendingFiles(prev => [...prev, ...newFiles]);
    if (newFiles.length > 0) showToast(`Выбрано фото: ${newFiles.length}`, 'success');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeExistingImage = (imgPath: string) => {
    setExistingImages(prev => prev.filter(i => i !== imgPath));
    setRemovedImages(prev => [...prev, imgPath]);
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Введите название';
    if (!form.shortDesc.trim()) errs.shortDesc = 'Введите краткое описание';
    if (!form.category.trim()) errs.category = 'Введите категорию';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const slug = form.slug.trim() || form.title.trim().toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').replace(/-+$/, '');
      const colors = form.colors.split(',').map(s => s.trim()).filter(Boolean);
      const sizes = form.sizes.split(',').map(s => s.trim()).filter(Boolean);
      const related = form.related.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      const alsoWith = form.alsoWith.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

      const data = { slug, title: form.title.trim(), shortDesc: form.shortDesc.trim(), description: form.description.trim(), colors, sizes, category: form.category.trim(), related, alsoWith };

      let productId: number;
      if (editingId !== null) {
        await apiUpdateProduct(editingId, data);
        productId = editingId;
      } else {
        const created = await apiCreateProduct(data);
        productId = created.id;
      }

      // Remove deleted images
      for (const imgPath of removedImages) {
        const filename = imgPath.split('/').pop();
        if (filename) await apiDeleteImage(filename).catch(() => {});
      }

      // Upload new files
      if (pendingFiles.length > 0) {
        setUploading(true);
        await apiUploadImages(productId, pendingFiles);
        setUploading(false);
      }

      showToast(editingId !== null ? 'Товар обновлён' : 'Товар добавлен', 'success');
      invalidateProductsCache();
      closeForm();
      await refreshData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
      setUploading(false);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Удалить "${title}"?`)) return;
    try {
      await apiDeleteProduct(id);
      invalidateProductsCache();
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('Товар удалён', 'info');
    } catch {
      showToast('Ошибка удаления', 'error');
    }
  };

  return (
    <div className="container">
      <div className="admin-workspace-title">
        <h1>Панель администратора</h1>
        <p>Приоритет — новые заявки. Каталог редактируется во второй вкладке.</p>
      </div>
      <div className="admin-panel">
        <div className="admin-panel__header">
          <div className="auth-tabs admin-tabs">
            <button className={`auth-tabs__btn${tab === 'orders' ? ' is-active' : ''}`} onClick={() => setTab('orders')}>Заявки ({orders.length})</button>
            <button className={`auth-tabs__btn${tab === 'catalog' ? ' is-active' : ''}`} onClick={() => setTab('catalog')}><BoxIcon /> Каталог</button>
          </div>
          <button className="btn btn--outline" onClick={handleLogout}>Выйти</button>
        </div>

        {/* ===== CATALOG TAB ===== */}
        {tab === 'catalog' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 12 }}>
              <h2>Товары ({products.length})</h2>
              <button className="btn btn--primary" onClick={openAddForm}>+ Добавить товар</button>
            </div>

            {showForm && (
              <div className="admin-product-form">
                <h3 style={{ marginBottom: 16 }}>{editingId !== null ? 'Редактирование товара' : 'Новый товар'}</h3>
                <div className="form" style={{ maxWidth: '100%' }}>
                  <div className="form__row">
                    <div className="input-group">
                      <label>Название *</label>
                      <input className={`input${formErrors.title ? ' input--error' : ''}`} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Коробка картонная А4" />
                      <div className="input-error-text">{formErrors.title || ''}</div>
                    </div>
                    <div className="input-group">
                      <label>Категория *</label>
                      <input
                        className={`input${formErrors.category ? ' input--error' : ''}`}
                        value={form.category}
                        onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                        placeholder="Выберите или введите новую"
                        list="category-list"
                      />
                      <datalist id="category-list">
                        {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                      <div className="input-error-text">{formErrors.category || ''}</div>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Краткое описание *</label>
                    <input className={`input${formErrors.shortDesc ? ' input--error' : ''}`} value={form.shortDesc} onChange={e => setForm(p => ({ ...p, shortDesc: e.target.value }))} placeholder="Краткое описание для карточки" />
                    <div className="input-error-text">{formErrors.shortDesc || ''}</div>
                  </div>
                  <div className="input-group">
                    <label>Полное описание</label>
                    <textarea className="textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Подробное описание товара..." />
                  </div>
                  <div className="form__row">
                    <div className="input-group">
                      <label>Цвета (через запятую)</label>
                      <input className="input" value={form.colors} onChange={e => setForm(p => ({ ...p, colors: e.target.value }))} placeholder="Белый, Крафт, Чёрный" />
                    </div>
                    <div className="input-group">
                      <label>Размеры (через запятую)</label>
                      <input className="input" value={form.sizes} onChange={e => setForm(p => ({ ...p, sizes: e.target.value }))} placeholder="310×220×150 мм, 310×220×200 мм" />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Slug (авто если пусто)</label>
                    <input className="input" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="korobka-kartonnaya-a4" />
                  </div>
                  <div className="form__row">
                    <div className="input-group">
                      <label>ID аналогов (через запятую)</label>
                      <input className="input" value={form.related} onChange={e => setForm(p => ({ ...p, related: e.target.value }))} placeholder="1, 2, 3" />
                    </div>
                    <div className="input-group">
                      <label>ID «С этим берут» (через запятую)</label>
                      <input className="input" value={form.alsoWith} onChange={e => setForm(p => ({ ...p, alsoWith: e.target.value }))} placeholder="7, 8, 10" />
                    </div>
                  </div>

                  {/* Image upload */}
                  <div className="input-group">
                    <label>Фотографии</label>
                    <div className="admin-images">
                      {existingImages.map((img, i) => (
                        <div key={`existing-${i}`} className="admin-images__item">
                          <img src={img} alt={`Фото ${i + 1}`} onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                          <button className="admin-images__remove" onClick={() => removeExistingImage(img)} title="Удалить" aria-label="Удалить фото"><XIcon /></button>
                        </div>
                      ))}
                      {pendingFiles.map((file, i) => (
                        <PendingImagePreview key={`pending-${i}`} file={file} index={i} onRemove={removePendingFile} />
                      
                      ))}
                      <label className="admin-images__add">
                        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                        <UploadIcon /> {uploading ? 'Загрузка' : 'Фото'}
                      </label>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted)', marginTop: 4 }}>
                      JPG, PNG, WebP. Макс. 10 МБ на файл. Фото сохраняются на сервере.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                      {saving ? 'Сохранение...' : editingId !== null ? 'Сохранить изменения' : 'Добавить товар'}
                    </button>
                    <button className="btn btn--outline" onClick={closeForm}>Отмена</button>
                  </div>
                </div>
              </div>
            )}

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Фото</th>
                    <th>Название</th>
                    <th>Категория</th>
                    <th>Цвета</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>
                        <img
                          src={p.images[0] || PLACEHOLDER}
                          alt={p.title}
                          style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }}
                          onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                        />
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.title}</td>
                      <td>{p.category}</td>
                      <td style={{ fontSize: 'var(--font-size-xs)' }}>{p.colors.join(', ')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn--ghost btn--sm btn--icon" onClick={() => openEditForm(p)} title="Редактировать" aria-label="Редактировать"><EditIcon /></button>
                          <button className="btn btn--ghost btn--sm btn--icon" onClick={() => handleDelete(p.id, p.title)} title="Удалить" aria-label="Удалить"><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== ORDERS TAB ===== */}
        {tab === 'orders' && (
          <div>
            <div className="admin-order-board">
              {(['all', 'Новая', 'В работе', 'Закрыта'] as OrderFilter[]).map(status => (
                <button
                  key={status}
                  className={`admin-order-board__item${orderFilter === status ? ' is-active' : ''}`}
                  onClick={() => setOrderFilter(status)}
                >
                  <span>{status === 'all' ? 'Все' : status}</span>
                  <strong>{ordersByStatus[status]}</strong>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 12 }}>
              <h2>Заявки в работу</h2>
              <div className="search-bar" style={{ maxWidth: 280 }}>
                <SearchIcon className="search-bar__icon" />
                <input className="input" type="text" placeholder="ID, телефон, email, товар" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
              </div>
            </div>
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}><p className="text-muted">Заявок пока нет</p></div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>ID</th><th>Дата</th><th>Клиент</th><th>Контакт</th><th>Товары</th><th>Статус</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr key={order.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{order.id}</td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>
                          <strong>{order.user.name}</strong>
                          {order.user.email && <div className="admin-table__muted">{order.user.email}</div>}
                        </td>
                        <td>
                          {order.user.phone}
                          <div className="admin-table__muted">{order.user.contactMethod}</div>
                        </td>
                        <td>{order.items.map(item => `${item.title} × ${item.qty}`).join(', ')}</td>
                        <td>
                          <select className="select" value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)}>
                            <option value="Новая">Новая</option>
                            <option value="В работе">В работе</option>
                            <option value="Закрыта">Закрыта</option>
                          </select>
                        </td>
                        <td><button className="btn btn--ghost btn--sm btn--icon" onClick={() => handleOrderDetail(order)} aria-label="Открыть заявку" title="Открыть заявку"><EyeIcon /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} title={selectedOrder ? `Заявка ${selectedOrder.id}` : ''} onClose={() => setDrawerOpen(false)}>
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><strong>ID:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedOrder.id}</span></div>
            <div><strong>Дата:</strong> {formatDate(selectedOrder.createdAt)}</div>
            <div><strong>Статус:</strong> {statusBadge(selectedOrder.status)}</div>
            <div><strong>Имя:</strong> {selectedOrder.user.name}</div>
            <div><strong>Телефон:</strong> {selectedOrder.user.phone}</div>
            {selectedOrder.user.email && <div><strong>Email:</strong> {selectedOrder.user.email}</div>}
            <div><strong>Способ связи:</strong> {selectedOrder.user.contactMethod}</div>
            {selectedOrder.comment && <div><strong>Комментарий:</strong> {selectedOrder.comment}</div>}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
            <div><strong>Товары:</strong></div>
            {selectedOrder.items.map((item, idx) => (
              <div key={idx} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div>{item.title} × {item.qty}</div>
                {item.selectedOptions?.color && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>Цвет: {item.selectedOptions.color}</div>}
                {item.selectedOptions?.size && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>Размер: {item.selectedOptions.size}</div>}
              </div>
            ))}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
            <div>
              <strong>Обработка:</strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {['Новая', 'В работе', 'Закрыта'].map(status => (
                  <button
                    key={status}
                    className={`btn btn--sm ${selectedOrder.status === status ? 'btn--primary' : 'btn--outline'}`}
                    onClick={() => handleStatusChange(selectedOrder.id, status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function PendingImagePreview({ file, index, onRemove }: { file: File; index: number; onRemove: (i: number) => void }) {
  const [url, setUrl] = React.useState('');
  React.useEffect(() => {
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [file]);
  return (
    <div className="admin-images__item admin-images__item--pending">
      {url && <img src={url} alt={file.name} />}
      <button className="admin-images__remove" onClick={() => onRemove(index)} title="Удалить" aria-label="Удалить фото"><XIcon /></button>
    </div>
  );
}
