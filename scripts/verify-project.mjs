import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const root = process.cwd();
const emojiPattern = /[\u{2600}-\u{27BF}\u{1F300}-\u{1FAFF}]/u;
const allowedEmojiFiles = new Set([
  path.join('src', 'assets', 'placeholder.svg'),
  path.join('public', 'assets', 'placeholder.svg'),
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(entry.name)) return [];
      return walk(full);
    }
    return [full];
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const sourceFiles = walk(path.join(root, 'src'))
  .concat(walk(path.join(root, 'server')))
  .filter(file => /\.(tsx?|css)$/.test(file));

const emojiHits = sourceFiles
  .map(file => ({
    rel: path.relative(root, file),
    text: fs.readFileSync(file, 'utf8'),
  }))
  .filter(file => !allowedEmojiFiles.has(file.rel) && emojiPattern.test(file.text))
  .map(file => file.rel);

assert(emojiHits.length === 0, `Emoji found in UI/source files: ${emojiHits.join(', ')}`);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert(pkg.dependencies.helmet, 'helmet dependency is required');
assert(pkg.dependencies['express-rate-limit'], 'express-rate-limit dependency is required');

const db = new Database(path.join(root, 'data.db'));
const duplicateSlugs = db.prepare(`
  SELECT slug, COUNT(*) as cnt
  FROM products
  WHERE slug <> ''
  GROUP BY slug
  HAVING cnt > 1
`).all();
assert(duplicateSlugs.length === 0, `Duplicate product slugs found: ${JSON.stringify(duplicateSlugs)}`);

const indexes = db.prepare("PRAGMA index_list('products')").all();
assert(indexes.some(index => index.name === 'idx_products_slug_unique' && index.unique === 1), 'products.slug unique index is missing');

const users = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
assert(users.cnt > 0, 'Database must contain at least one user');

console.log('Project verification passed');
