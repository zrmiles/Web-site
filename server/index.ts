import express, { CookieOptions, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import db, { bcrypt, SALT_ROUNDS } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters. Set it in .env.');
  process.exit(1);
}

const JWT_EXPIRES = '7d';
const AUTH_COOKIE = 'pack_store_auth';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === 'production';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');
const clientDistDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface AuthRequest extends Request {
  user?: { id: number; login: string; role: string; name: string; phone: string };
}

interface ProductRow {
  id: number;
  slug: string;
  title: string;
  short_desc: string;
  description: string;
  category: string;
  colors: string;
  sizes: string;
  related: string;
  also_with: string;
  created_at: string;
}

interface ImageRow {
  id: number;
  product_id: number;
  filename: string;
  sort_order: number;
}

interface OrderRow {
  id: string;
  user_name: string;
  user_phone: string;
  user_email: string;
  contact_method: string;
  comment: string;
  items: string;
  status: string;
  created_at: string;
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'lax',
  path: '/',
  maxAge: COOKIE_MAX_AGE_MS,
};

function limiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    legacyHeaders: false,
    standardHeaders: 'draft-8',
    message: { error: message },
  });
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api', limiter(15 * 60 * 1000, 600, 'Слишком много запросов. Повторите позже.'));
app.use('/uploads', express.static(uploadsDir, {
  fallthrough: false,
  setHeaders: res => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', IS_PROD ? 'public, max-age=86400' : 'no-store');
  },
}));

const authLimiter = limiter(15 * 60 * 1000, 10, 'Слишком много попыток входа. Повторите позже.');
const writeLimiter = limiter(15 * 60 * 1000, 120, 'Слишком много изменений. Повторите позже.');
const orderLimiter = limiter(15 * 60 * 1000, 20, 'Слишком много заявок. Повторите позже.');
const uploadLimiter = limiter(15 * 60 * 1000, 30, 'Слишком много загрузок. Повторите позже.');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const UPLOAD_FILENAME_RE = /^\d+-[a-z0-9]{6}\.(jpg|jpeg|png|webp|gif)$/i;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${mimeToExt[file.mimetype] || '.jpg'}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    const extOk = ALLOWED_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase());
    const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    return cb(new HttpError(400, 'Допустимы только изображения: JPG, PNG, WebP, GIF'));
  },
});

function setAuthCookie(res: Response, user: { id: number; login: string; role: string }) {
  const token = jwt.sign({ id: user.id, login: user.login, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.cookie(AUTH_COOKIE, token, authCookieOptions);
}

function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, { ...authCookieOptions, maxAge: undefined });
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(header.split(';').map(part => {
    const [rawKey, ...rawVal] = part.trim().split('=');
    let value = rawVal.join('=');
    try {
      value = decodeURIComponent(value);
    } catch {
      value = '';
    }
    return [rawKey, value];
  }).filter(([key]) => key));
}

function getRequestToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return parseCookies(req.headers.cookie)[AUTH_COOKIE] || null;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = getRequestToken(req);
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as { id: number };
    const user = db.prepare('SELECT id, login, name, phone, role FROM users WHERE id = ?').get(payload.id) as AuthRequest['user'] | undefined;
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Недействительный или истёкший токен' });
  }
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён: требуются права администратора' });
    return next();
  });
}

// Attaches req.user when a valid token is present, but never rejects the request.
function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = getRequestToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as unknown as { id: number };
      const user = db.prepare('SELECT id, login, name, phone, role FROM users WHERE id = ?').get(payload.id) as AuthRequest['user'] | undefined;
      if (user) req.user = user;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  return next();
}

function safeJsonParse<T>(val: string, fallback: T): T {
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

function toCleanString(value: unknown, max = 500): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeLogin(value: unknown): string {
  return toCleanString(value, 40).toLowerCase();
}

function normalizeSlug(value: unknown): string {
  return toCleanString(value, 120).toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}

function validatePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function validateEmail(value: string): boolean {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseStringArray(value: unknown, maxItems = 30): string[] {
  return Array.isArray(value) ? value.map(item => toCleanString(item, 80)).filter(Boolean).slice(0, maxItems) : [];
}

function parseIdArray(value: unknown, maxItems = 30): number[] {
  return Array.isArray(value) ? value.map(Number).filter(item => Number.isInteger(item) && item > 0).slice(0, maxItems) : [];
}

function parsePositiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function formatProduct(row: ProductRow, images: ImageRow[] = []) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDesc: row.short_desc,
    description: row.description,
    category: row.category,
    colors: safeJsonParse<string[]>(row.colors || '[]', []),
    sizes: safeJsonParse<string[]>(row.sizes || '[]', []),
    related: safeJsonParse<number[]>(row.related || '[]', []),
    alsoWith: safeJsonParse<number[]>(row.also_with || '[]', []),
    images: images.map(img => `/uploads/${img.filename}`),
    createdAt: row.created_at,
  };
}

function formatOrder(row: OrderRow) {
  return {
    id: row.id,
    user: { name: row.user_name, phone: row.user_phone, email: row.user_email, contactMethod: row.contact_method },
    comment: row.comment,
    items: safeJsonParse(row.items || '[]', []),
    status: row.status,
    createdAt: row.created_at,
  };
}

function validateProductPayload(body: Record<string, unknown>) {
  const title = toCleanString(body.title, 160);
  const shortDesc = toCleanString(body.shortDesc, 260);
  const description = toCleanString(body.description, 3000);
  const category = normalizeSlug(body.category);
  const slug = normalizeSlug(body.slug || title);
  if (!title) throw new HttpError(400, 'Введите название товара');
  if (!shortDesc) throw new HttpError(400, 'Введите краткое описание товара');
  if (!category) throw new HttpError(400, 'Введите категорию');
  if (!slug) throw new HttpError(400, 'Введите slug товара');
  return {
    slug,
    title,
    shortDesc,
    description,
    category,
    colors: parseStringArray(body.colors),
    sizes: parseStringArray(body.sizes),
    related: parseIdArray(body.related),
    alsoWith: parseIdArray(body.alsoWith),
  };
}

function isSafeUploadFilename(filename: string): boolean {
  return UPLOAD_FILENAME_RE.test(filename) && path.basename(filename) === filename;
}

function detectImageMime(filePath: string): string | null {
  const bytes = fs.readFileSync(filePath).subarray(0, 12);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.subarray(0, 6).toString() === 'GIF87a' || bytes.subarray(0, 6).toString() === 'GIF89a') return 'image/gif';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

function removeUploadFile(filename: string) {
  if (!isSafeUploadFilename(filename)) return;
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function cleanupFiles(files: Express.Multer.File[] = []) {
  for (const file of files) removeUploadFile(file.filename);
}

function validateUploadedFiles(files: Express.Multer.File[]) {
  for (const file of files) {
    const detected = detectImageMime(file.path);
    if (!detected || detected !== file.mimetype) {
      cleanupFiles(files);
      throw new HttpError(400, 'Файл не похож на корректное изображение');
    }
  }
}

function validateOrderPayload(body: Record<string, unknown>) {
  const rawUser = (body.user || {}) as Record<string, unknown>;
  const name = toCleanString(rawUser.name, 200);
  const phone = toCleanString(rawUser.phone, 30);
  const email = toCleanString(rawUser.email, 200).toLowerCase();
  const contactMethod = ['phone', 'telegram', 'email'].includes(String(rawUser.contactMethod)) ? String(rawUser.contactMethod) : 'phone';
  const comment = toCleanString(body.comment, 2000);
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (name.length < 2) throw new HttpError(400, 'Введите имя');
  if (!validatePhone(phone)) throw new HttpError(400, 'Введите корректный телефон');
  if (!email) throw new HttpError(400, 'Введите email');
  if (!validateEmail(email)) throw new HttpError(400, 'Введите корректный email');
  if (rawItems.length === 0 || rawItems.length > 100) throw new HttpError(400, 'В заявке должен быть от 1 до 100 товаров');
  const items = rawItems.map(raw => {
    const item = (raw || {}) as Record<string, unknown>;
    const productId = parsePositiveId(item.productId);
    const qty = Number(item.qty);
    if (!productId) throw new HttpError(400, 'Некорректный товар в заявке');
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) throw new HttpError(400, 'Некорректное количество товара');
    const product = db.prepare('SELECT id, title FROM products WHERE id = ?').get(productId) as { id: number; title: string } | undefined;
    if (!product) throw new HttpError(400, 'Один из товаров не найден');
    const selectedOptions = (item.selectedOptions || {}) as Record<string, unknown>;
    return {
      productId,
      title: product.title,
      qty,
      selectedOptions: {
        color: toCleanString(selectedOptions.color, 80),
        size: toCleanString(selectedOptions.size, 80),
      },
    };
  });
  return { user: { name, phone, email, contactMethod }, comment, items };
}

function asyncRoute(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

app.post('/api/auth/login', authLimiter, asyncRoute(async (req, res) => {
  const login = normalizeLogin(req.body.login);
  const password = String(req.body.password || '');
  if (!login || !password) throw new HttpError(400, 'Введите логин и пароль');
  const user = db.prepare('SELECT id, login, name, phone, role, password FROM users WHERE login = ?').get(login) as {
    id: number; login: string; name: string; phone: string; role: string; password: string;
  } | undefined;
  if (!user) throw new HttpError(401, 'Неверный логин или пароль');
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new HttpError(401, 'Неверный логин или пароль');
  setAuthCookie(res, user);
  const { password: _password, ...safeUser } = user;
  res.json(safeUser);
}));

app.post('/api/auth/register', authLimiter, asyncRoute(async (req, res) => {
  const login = normalizeLogin(req.body.login);
  const password = String(req.body.password || '');
  const name = toCleanString(req.body.name, 120);
  const phone = toCleanString(req.body.phone, 30);
  if (!/^[a-z0-9_.-]{3,40}$/.test(login)) throw new HttpError(400, 'Логин: 3-40 символов, латиница, цифры, точка, дефис или подчёркивание');
  if (password.length < 8) throw new HttpError(400, 'Пароль должен быть не короче 8 символов');
  if (name.length < 2) throw new HttpError(400, 'Введите имя');
  if (!validatePhone(phone)) throw new HttpError(400, 'Введите корректный телефон');
  const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(login);
  if (existing) throw new HttpError(409, 'Пользователь с таким логином уже существует');
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const result = db.prepare('INSERT INTO users (login, password, name, phone, role) VALUES (?, ?, ?, ?, ?)').run(login, hashed, name, phone, 'user');
  const user = db.prepare('SELECT id, login, name, phone, role FROM users WHERE id = ?').get(result.lastInsertRowid) as { id: number; login: string; name: string; phone: string; role: string };
  setAuthCookie(res, user);
  res.status(201).json(user);
}));

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => res.json(req.user));
app.post('/api/auth/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/products', (req, res) => {
  const idsParam = toCleanString(req.query.ids, 400);
  const ids = idsParam
    ? idsParam.split(',').map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 100)
    : null;
  const rows = (ids
    ? (ids.length > 0
      ? db.prepare(`SELECT * FROM products WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id`).all(...ids)
      : [])
    : db.prepare('SELECT * FROM products ORDER BY id').all()) as ProductRow[];
  const allImages = db.prepare('SELECT * FROM product_images ORDER BY sort_order').all() as ImageRow[];
  const imagesByProduct = new Map<number, ImageRow[]>();
  for (const img of allImages) {
    if (!imagesByProduct.has(img.product_id)) imagesByProduct.set(img.product_id, []);
    imagesByProduct.get(img.product_id)!.push(img);
  }
  res.json(rows.map(row => formatProduct(row, imagesByProduct.get(row.id) || [])));
});

app.get('/api/products/:idOrSlug', (req, res) => {
  const param = toCleanString(req.params.idOrSlug, 120);
  const numericId = parsePositiveId(param);
  const row = (numericId
    ? db.prepare('SELECT * FROM products WHERE id = ?').get(numericId)
    : db.prepare('SELECT * FROM products WHERE slug = ?').get(param)) as ProductRow | undefined;
  if (!row) throw new HttpError(404, 'Товар не найден');
  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(row.id) as ImageRow[];
  res.json(formatProduct(row, images));
});

app.post('/api/products', requireAdmin, writeLimiter, (req, res) => {
  const data = validateProductPayload(req.body);
  const result = db.prepare(
    'INSERT INTO products (slug, title, short_desc, description, category, colors, sizes, related, also_with) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(data.slug, data.title, data.shortDesc, data.description, data.category, JSON.stringify(data.colors), JSON.stringify(data.sizes), JSON.stringify(data.related), JSON.stringify(data.alsoWith));
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid) as ProductRow;
  res.status(201).json(formatProduct(row));
});

app.put('/api/products/:id', requireAdmin, writeLimiter, (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) throw new HttpError(400, 'Некорректный ID товара');
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(id)) throw new HttpError(404, 'Товар не найден');
  const data = validateProductPayload(req.body);
  db.prepare('UPDATE products SET slug=?, title=?, short_desc=?, description=?, category=?, colors=?, sizes=?, related=?, also_with=? WHERE id=?')
    .run(data.slug, data.title, data.shortDesc, data.description, data.category, JSON.stringify(data.colors), JSON.stringify(data.sizes), JSON.stringify(data.related), JSON.stringify(data.alsoWith), id);
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow;
  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(id) as ImageRow[];
  res.json(formatProduct(row, images));
});

app.delete('/api/products/:id', requireAdmin, writeLimiter, (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) throw new HttpError(400, 'Некорректный ID товара');
  const images = db.prepare('SELECT filename FROM product_images WHERE product_id = ?').all(id) as { filename: string }[];
  for (const img of images) removeUploadFile(img.filename);
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ ok: true });
});

app.post('/api/products/:id/images', requireAdmin, uploadLimiter, upload.array('images', 12), (req: AuthRequest, res: Response) => {
  const productId = parsePositiveId(req.params.id);
  const files = (req.files as Express.Multer.File[]) || [];
  if (!productId) { cleanupFiles(files); throw new HttpError(400, 'Некорректный ID товара'); }
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(productId)) { cleanupFiles(files); throw new HttpError(404, 'Товар не найден'); }
  if (files.length === 0) throw new HttpError(400, 'Нет файлов');
  validateUploadedFiles(files);
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as mx FROM product_images WHERE product_id = ?').get(productId) as { mx: number | null })?.mx || 0;
  const insertImage = db.prepare('INSERT INTO product_images (product_id, filename, sort_order) VALUES (?, ?, ?)');
  const inserted = files.map((file, i) => {
    insertImage.run(productId, file.filename, maxOrder + i + 1);
    return `/uploads/${file.filename}`;
  });
  res.status(201).json({ images: inserted });
});

app.delete('/api/images/:filename', requireAdmin, writeLimiter, (req, res) => {
  const filename = req.params.filename;
  if (!isSafeUploadFilename(filename)) throw new HttpError(400, 'Некорректное имя файла');
  db.prepare('DELETE FROM product_images WHERE filename = ?').run(filename);
  removeUploadFile(filename);
  res.json({ ok: true });
});

app.get('/api/orders', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all() as OrderRow[];
  res.json(rows.map(formatOrder));
});

// Orders that belong to the current user — matched by user_id, falling back to phone
// for orders placed before they registered (or as a guest with the same number).
app.get('/api/orders/mine', requireAuth, (req: AuthRequest, res) => {
  const rows = db.prepare(
    'SELECT * FROM orders WHERE user_id = ? OR (user_id IS NULL AND user_phone = ?) ORDER BY created_at DESC'
  ).all(req.user!.id, req.user!.phone) as OrderRow[];
  res.json(rows.map(formatOrder));
});

app.get('/api/orders/by-phone/:phone', requireAuth, (req: AuthRequest, res) => {
  const phone = decodeURIComponent(req.params.phone);
  if (req.user!.role !== 'admin' && req.user!.phone !== phone) throw new HttpError(403, 'Доступ запрещён');
  const rows = db.prepare('SELECT * FROM orders WHERE user_phone = ? ORDER BY created_at DESC').all(phone) as OrderRow[];
  res.json(rows.map(formatOrder));
});

app.post('/api/orders', orderLimiter, optionalAuth, (req: AuthRequest, res) => {
  const data = validateOrderPayload(req.body);
  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  db.prepare('INSERT INTO orders (id, user_id, user_name, user_phone, user_email, contact_method, comment, items, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(orderId, req.user?.id ?? null, data.user.name, data.user.phone, data.user.email, data.user.contactMethod, data.comment, JSON.stringify(data.items), 'Новая');
  res.status(201).json({ id: orderId });
});

app.patch('/api/orders/:id/status', requireAdmin, writeLimiter, (req: AuthRequest, res) => {
  const status = toCleanString(req.body.status, 40);
  const allowed = ['Новая', 'В работе', 'Закрыта'];
  if (!allowed.includes(status)) throw new HttpError(400, 'Недопустимый статус');
  const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if (result.changes === 0) throw new HttpError(404, 'Заявка не найдена');
  res.json({ ok: true });
});

// ====== Favorites (per-user, synced across devices) ======

app.get('/api/favorites', requireAuth, (req: AuthRequest, res) => {
  const rows = db.prepare('SELECT product_id FROM favorites WHERE user_id = ? ORDER BY id').all(req.user!.id) as { product_id: number }[];
  res.json(rows.map(row => row.product_id));
});

app.post('/api/favorites/:productId', requireAuth, writeLimiter, (req: AuthRequest, res) => {
  const productId = parsePositiveId(req.params.productId);
  if (!productId) throw new HttpError(400, 'Некорректный ID товара');
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(productId)) throw new HttpError(404, 'Товар не найден');
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)').run(req.user!.id, productId);
  res.status(201).json({ ok: true });
});

app.delete('/api/favorites/:productId', requireAuth, writeLimiter, (req: AuthRequest, res) => {
  const productId = parsePositiveId(req.params.productId);
  if (!productId) throw new HttpError(400, 'Некорректный ID товара');
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(req.user!.id, productId);
  res.json({ ok: true });
});

// Merge guest favorites (from localStorage) into the account on login, returns the union.
app.put('/api/favorites', requireAuth, writeLimiter, (req: AuthRequest, res) => {
  const ids = parseIdArray(req.body.productIds, 200);
  const insert = db.prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM products WHERE id = ?)');
  const mergeAll = db.transaction((productIds: number[]) => {
    for (const productId of productIds) insert.run(req.user!.id, productId, productId);
  });
  mergeAll(ids);
  const rows = db.prepare('SELECT product_id FROM favorites WHERE user_id = ? ORDER BY id').all(req.user!.id) as { product_id: number }[];
  res.json(rows.map(row => row.product_id));
});

if (IS_PROD && fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir, {
    index: false,
    setHeaders: res => {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  }));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Файл больше 8 МБ' : err.code === 'LIMIT_FILE_COUNT' ? 'Слишком много файлов' : 'Ошибка загрузки файла';
    return res.status(400).json({ error: message });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  const maybeSqlite = err as { code?: string };
  if (maybeSqlite.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Запись с такими данными уже существует' });
  if (!IS_PROD) console.error(err);
  return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});
