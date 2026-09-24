import { decrypt, validPrivateData, safeURL } from './crypto.js';
let details = null;
let generation = 0;
const listeners = new Set();
export const isUnlocked = () => details !== null;
export const getPrivate = id => details && Object.hasOwn(details,id) ? details[id] : null;
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const announce = () => listeners.forEach(fn=>fn());
export function lock() { generation++; details=null; announce(); }
export async function unlock(password, requiredIds) {
  const operation = ++generation;
  let candidate;
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}private.enc.json`, {cache:'no-store'});
    if (!response.ok) throw new Error('Encrypted data unavailable');
    candidate = await decrypt(await response.json(), password);
    password = null;
    if (operation !== generation) return false;
    if (!validPrivateData(candidate) || requiredIds.some(id=>!Object.hasOwn(candidate,id))) throw new Error('Invalid private details');
    details=candidate; candidate=null; announce(); return true;
  } finally { password=null; candidate=null; }
}
class PrivateDetail extends HTMLElement {
  connectedCallback() { this.unsubscribe=subscribe(()=>this.render()); this.render(); }
  disconnectedCallback() { this.unsubscribe?.(); this.replaceChildren(); }
  render() {
    this.replaceChildren();
    const item = getPrivate(this.dataset.ref);
    if (!item) {
      const button=document.createElement('button'); button.type='button'; button.className='private-placeholder';
      const icon=document.createElement('span'); icon.textContent='⌑'; icon.setAttribute('aria-hidden','true');
      const label=document.createElement('span'); label.textContent=this.dataset.label || '상세 정보 잠김';
      button.append(icon,label); button.addEventListener('click',()=>document.dispatchEvent(new Event('request-unlock')));
      this.append(button); return;
    }
    const wrap=document.createElement('div'); wrap.className='private-content';
    const title=document.createElement('strong'); title.textContent=item.title; wrap.append(title);
    for (const line of item.lines) { const p=document.createElement('p'); p.textContent=line; wrap.append(p); }
    for (const link of item.links) {
      const url=safeURL(link.url); if (!url) continue;
      const a=document.createElement('a'); a.href=url; a.textContent=`${link.label} ↗`; a.target='_blank'; a.rel='noopener noreferrer'; a.referrerPolicy='no-referrer'; wrap.append(a);
    }
    this.append(wrap);
  }
}
customElements.define('private-detail',PrivateDetail);
