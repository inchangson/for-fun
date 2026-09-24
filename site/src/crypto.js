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
  return !!data && typeof data === 'object' && !Array.isArray(data) && Object.values(data).every(item =>
    item && typeof item.title === 'string' && Array.isArray(item.lines) && item.lines.every(x=>typeof x==='string') &&
    Array.isArray(item.links) && item.links.every(x=>typeof x.label==='string' && safeURL(x.url)));
}
export function safeURL(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
