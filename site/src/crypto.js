export const ITERATIONS = 600000;
function encode(bytes) { return btoa(String.fromCharCode(...bytes)); }
function decode(str) { return Uint8Array.from(atob(str), c => c.charCodeAt(0)); }
async function derive(password, salt, usages) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:ITERATIONS, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, false, usages);
}
export async function encrypt(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(data)));
  // Encode in chunks: large drafts must not overflow the JS call stack.
  let encoded = ''; const bytes = new Uint8Array(encrypted);
  for (let i=0; i<bytes.length; i+=8192) encoded += String.fromCharCode(...bytes.subarray(i,i+8192));
  return {version:1, algorithm:'AES-256-GCM', kdf:'PBKDF2-SHA-256', iterations:ITERATIONS, salt:encode(salt), iv:encode(iv), ciphertext:btoa(encoded)};
}
export async function decrypt(envelope, password) {
  if (envelope?.version !== 1 || envelope.algorithm !== 'AES-256-GCM' || envelope.kdf !== 'PBKDF2-SHA-256' || envelope.iterations !== ITERATIONS) throw new Error('Unsupported encrypted format');
  const salt = decode(envelope.salt), iv = decode(envelope.iv);
  if (salt.length !== 16 || iv.length !== 12) throw new Error('Invalid encrypted format');
  const key = await derive(password, salt, ['decrypt']);
  const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, decode(envelope.ciphertext));
  return JSON.parse(new TextDecoder().decode(plain));
}
export function validPrivateData(data) {
  const text = x => typeof x === 'string';
  const list = (x, check) => Array.isArray(x) && x.every(check);
  const link = x => x && text(x.label) && !!safeURL(x.url);
  const opaque = x => typeof x === 'string' && /^[a-f0-9]{32}$/.test(x);
  const item = x => x && text(x.eyebrow) && text(x.title) && list(x.lines, text) && list(x.links, link) &&
    (x.id === undefined || opaque(x.id)) && (x.rating === undefined || Number.isInteger(x.rating) && x.rating >= 0 && x.rating <= 3) &&
    (x.meta === undefined || text(x.meta)) && (x.time === undefined || text(x.time)) &&
    (x.refs === undefined || list(x.refs, r => r && opaque(r.target) && text(r.label)));
  const section = x => x && text(x.title) && text(x.body) && list(x.items, item);
  const page = x => x && opaque(x.id) && text(x.label) && text(x.kicker) && text(x.title) && text(x.intro) && list(x.sections, section) &&
    (x.layout === undefined || ['timeline','mapping'].includes(x.layout)) &&
    (x.summaryLabel === undefined || text(x.summaryLabel)) && (x.ratingLabel === undefined || text(x.ratingLabel));
  const valid = !!data && data.version === 1 && text(data.title) && text(data.subtitle) &&
    list(data.pages, page) && data.pages.length > 0 && new Set(data.pages.map(x => x.id)).size === data.pages.length;
  if (!valid) return false;
  const items = data.pages.flatMap(p => p.sections.flatMap(s => s.items));
  const ids = items.filter(i => i.id).map(i => i.id);
  return new Set([...data.pages.map(p => p.id), ...ids]).size === data.pages.length + ids.length &&
    items.every(i => !i.refs || i.refs.every(r => ids.includes(r.target)));
}
export function safeURL(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
