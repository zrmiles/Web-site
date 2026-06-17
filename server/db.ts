import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data.db');

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    short_desc TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    colors TEXT NOT NULL DEFAULT '[]',
    sizes TEXT NOT NULL DEFAULT '[]',
    related TEXT NOT NULL DEFAULT '[]',
    also_with TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL DEFAULT '',
    user_phone TEXT NOT NULL DEFAULT '',
    user_email TEXT NOT NULL DEFAULT '',
    contact_method TEXT NOT NULL DEFAULT 'phone',
    comment TEXT NOT NULL DEFAULT '',
    items TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'Новая',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    UNIQUE(user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );
`);

// Link orders to the authenticated user that created them (nullable: guest orders allowed).
const orderColumns = db.prepare(`PRAGMA table_info(orders)`).all() as { name: string }[];
if (!orderColumns.some(col => col.name === 'user_id')) {
  db.exec(`ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
  CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
  CREATE INDEX IF NOT EXISTS idx_orders_user_phone ON orders(user_phone);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
`);

const duplicateSlugs = db.prepare(`
  SELECT slug, MIN(id) as keep_id
  FROM products
  WHERE slug <> ''
  GROUP BY slug
  HAVING COUNT(*) > 1
`).all() as { slug: string; keep_id: number }[];
for (const duplicate of duplicateSlugs) {
  db.prepare('DELETE FROM products WHERE slug = ? AND id <> ?').run(duplicate.slug, duplicate.keep_id);
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug_unique ON products(slug) WHERE slug <> '';
`);

// Seed admin user if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE login = ?').get('admin');
if (!adminExists) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.warn('ADMIN_PASSWORD is not set. Set ADMIN_PASSWORD in .env.');
    process.exit(1);
  }
  const hashed = bcrypt.hashSync(adminPassword, SALT_ROUNDS);
  db.prepare('INSERT INTO users (login, password, name, phone, role) VALUES (?, ?, ?, ?, ?)').run(
    'admin', hashed, 'Администратор', '+7 (000) 000-00-00', 'admin'
  );
  console.log('Admin user created: login=admin');
}

// Migrate existing plain-text passwords to bcrypt hashes
const allUsers = db.prepare('SELECT id, password FROM users').all() as { id: number; password: string }[];
for (const user of allUsers) {
  if (!user.password.startsWith('$2')) {
    const hashed = bcrypt.hashSync(user.password, SALT_ROUNDS);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, user.id);
    console.log(`Migrated password hash for user id=${user.id}`);
  }
}

// Seed products if empty
const productCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number };
if (productCount.cnt === 0) {
  const seedProducts = [
    { slug: 'korobka-kartonnaya-a4', title: 'Коробка картонная А4', shortDesc: 'Универсальная коробка из трёхслойного гофрокартона', description: 'Коробка из трёхслойного гофрокартона. Подходит для хранения документов, упаковки товаров среднего размера.', category: 'korobki', colors: '["Крафт","Белый"]', sizes: '["310×220×150 мм","310×220×200 мм"]', related: '[2,3]', alsoWith: '[7,10]' },
    { slug: 'korobka-pochta-m', title: 'Коробка почтовая М', shortDesc: 'Почтовая коробка среднего размера для отправлений', description: 'Почтовая коробка стандартного размера М. Соответствует нормам почтовых служб России.', category: 'korobki', colors: '["Крафт"]', sizes: '["250×170×100 мм"]', related: '[1,3]', alsoWith: '[8,11]' },
    { slug: 'korobka-samosbornaya', title: 'Коробка самосборная', shortDesc: 'Быстрая сборка без клея и скотча', description: 'Самосборная коробка с замковым клапаном. Не требует клея или скотча для сборки.', category: 'korobki', colors: '["Крафт","Белый","Чёрный"]', sizes: '["200×150×100 мм","300×200×150 мм"]', related: '[1,2]', alsoWith: '[9,12]' },
    { slug: 'paket-kraft-s-ruchkami', title: 'Пакет крафт с ручками', shortDesc: 'Экологичный бумажный пакет с кручеными ручками', description: 'Крафт-пакет с кручеными бумажными ручками. Экологичная альтернатива пластиковым пакетам.', category: 'pakety', colors: '["Крафт","Белый"]', sizes: '["220×120×250 мм","320×200×340 мм","450×170×480 мм"]', related: '[5,6]', alsoWith: '[10,11]' },
    { slug: 'paket-zip-lock', title: 'Пакет зип-лок', shortDesc: 'Прозрачный пакет с замком zip-lock', description: 'Прозрачный полиэтиленовый пакет с многоразовой застёжкой zip-lock.', category: 'pakety', colors: '["Прозрачный"]', sizes: '["100×150 мм","150×200 мм","200×300 мм"]', related: '[4,6]', alsoWith: '[7,12]' },
    { slug: 'paket-kuriersky', title: 'Пакет курьерский', shortDesc: 'Непрозрачный пакет для курьерской доставки', description: 'Курьерский пакет из полиэтилена с клеевым клапаном и карманом для сопроводительных документов.', category: 'pakety', colors: '["Чёрный","Белый"]', sizes: '["240×320 мм","300×400 мм","400×500 мм"]', related: '[4,5]', alsoWith: '[8,9]' },
    { slug: 'plenka-vozdushno-pupy', title: 'Плёнка воздушно-пузырьковая', shortDesc: 'Защитная плёнка с воздушными пузырьками', description: 'Воздушно-пузырьковая плёнка для защиты хрупких товаров при транспортировке.', category: 'plenki', colors: '["Прозрачный"]', sizes: '["0.5×10 м","1.0×10 м","1.2×50 м"]', related: '[8,9]', alsoWith: '[1,2]' },
    { slug: 'plenka-streych', title: 'Плёнка стрейч', shortDesc: 'Растягивающаяся плёнка для паллетирования', description: 'Стрейч-плёнка для обмотки паллет и групповой упаковки товаров. Высокая растяжимость.', category: 'plenki', colors: '["Прозрачный","Чёрный"]', sizes: '["450 мм × 300 м","500 мм × 300 м"]', related: '[7,9]', alsoWith: '[3,6]' },
    { slug: 'skotch-prozrachny', title: 'Скотч прозрачный', shortDesc: 'Упаковочная клейкая лента 48 мм', description: 'Прозрачная клейкая лента шириной 48 мм. Стандартная длина рулона — 66 метров.', category: 'raskhodnye', colors: '["Прозрачный","Коричневый"]', sizes: '["48 мм × 66 м","48 мм × 132 м"]', related: '[10,11]', alsoWith: '[1,3]' },
    { slug: 'skotch-firmenny', title: 'Скотч с логотипом', shortDesc: 'Брендированная клейкая лента с вашим логотипом', description: 'Скотч с нанесением вашего логотипа. Минимальный тираж от 72 рулонов.', category: 'raskhodnye', colors: '["Белый","Крафт"]', sizes: '["48 мм × 66 м","72 мм × 66 м"]', related: '[9,11]', alsoWith: '[4,6]' },
    { slug: 'napolnitel-bumazhny', title: 'Наполнитель бумажный', shortDesc: 'Бумажная стружка для заполнения пустот', description: 'Нарезанная бумажная стружка для декоративного наполнения и амортизации в коробках.', category: 'raskhodnye', colors: '["Крафт","Белый","Тишью микс"]', sizes: '["0.5 кг","1 кг","5 кг"]', related: '[12,9]', alsoWith: '[1,4]' },
    { slug: 'bumaga-tishu', title: 'Бумага тишью', shortDesc: 'Тонкая декоративная бумага для упаковки', description: 'Тонкая папиросная бумага (тишью) для оборачивания товаров и декоративного оформления подарков.', category: 'raskhodnye', colors: '["Белый","Чёрный","Розовый","Тиффани"]', sizes: '["50×70 см (10 листов)","50×70 см (100 листов)"]', related: '[11,10]', alsoWith: '[3,4]' },
  ];
  const insertProduct = db.prepare('INSERT INTO products (slug, title, short_desc, description, category, colors, sizes, related, also_with) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const p of seedProducts) {
    insertProduct.run(p.slug, p.title, p.shortDesc, p.description, p.category, p.colors, p.sizes, p.related, p.alsoWith);
  }
}

export { bcrypt, SALT_ROUNDS };
export default db;
