import { decrypt, validPrivateData } from './crypto.js';
let details = null;
let generation = 0;
const listeners = new Set();
export const isUnlocked = () => details !== null;
export const getDocument = () => details;
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const announce = () => listeners.forEach(fn => fn());
export function lock() { generation++; details = null; announce(); }
export async function unlock(password) {
  const operation = ++generation;
  let candidate;
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}private.enc.json`, {cache:'no-store'});
    if (!response.ok) throw new Error('Encrypted data unavailable');
    candidate = await decrypt(await response.json(), password);
    password = null;
    if (operation !== generation) return false;
    if (!validPrivateData(candidate)) throw new Error('Invalid private document');
    details = candidate; candidate = null; announce(); return true;
  } finally { password = null; candidate = null; }
}
