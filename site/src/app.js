import './styles.css';
import { lock, unlock, isUnlocked, getDocument, subscribe } from './privacy.js';
import { safeURL } from './crypto.js';
const $ = s => document.querySelector(s);
const main = $('#main'), dialog = $('#unlock-dialog'), input = $('#password');
let attempt = 0;
function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function resetForm() {
  input.value = ''; $('#unlock-submit').disabled = false; $('#unlock-error').textContent = '';
}
function cancel() { attempt++; lock(); resetForm(); if(dialog.open) dialog.close(); }
function openDialog() { resetForm(); if(!dialog.open) dialog.showModal(); input.focus(); }
function render() {
  main.replaceChildren(); $('#navigation').replaceChildren();
  const doc = getDocument();
  $('#privacy-toggle').setAttribute('aria-checked', String(!!doc));
  $('#toggle-state').textContent = doc ? 'ON · 잠그기' : 'OFF';
  $('#navigation').hidden = !doc;
  $('#brand-label').textContent = doc ? doc.title : 'PRIVATE DOCUMENT';
  // Keep browser title generic: decrypted titles must not enter browser history.
  if (!doc) {
    const screen = node('section', undefined, 'locked-screen');
    screen.append(node('p','ENCRYPTED / PRIVATE ACCESS','eyebrow'),node('div','↗','lock-art'),node('h1','함께 볼 자료,\n안전하게 보관했습니다.'),node('p','비밀번호를 입력하면 전체 자료를 볼 수 있습니다.','locked-description'));
    const button = node('button','자료 열기 ↗','primary'); button.addEventListener('click',openDialog);
    screen.append(button,node('p','열람은 이 탭에서만 유지됩니다.','lock-note')); main.append(screen); return;
  }
  const id = location.hash.slice(2);
  const page = doc.pages.find(x => x.id === id || x.sections.some(s => s.items.some(i => i.id === id))) || doc.pages[0];
  for (const [index,p] of doc.pages.entries()) {
    const a = node('a', `${String(index+1).padStart(2,'0')}  ${p.label}`);
    a.href = '#/' + p.id;
    if (p === page) a.setAttribute('aria-current','page');
    $('#navigation').append(a);
  }
  const article = node('article', undefined, 'document ' + (page.layout || ''));
  const hero = node('section', undefined, 'hero');
  const strap = node('div',undefined,'strap'); strap.append(node('span',page.kicker),node('span',doc.subtitle));
  hero.append(strap,node('h1',page.title),node('p',page.intro,'intro')); article.append(hero);
  for (const [index,section] of page.sections.entries()) {
    const block = node('section',undefined,'document-section');
    const heading = node('div',undefined,'section-heading'); heading.append(node('span',String(index+1).padStart(2,'0'),'section-number'),node('h2',section.title));
    block.append(heading,node('p',section.body,'section-body'));
    const grid = node('div',undefined,section.items.length===3 ? 'cards three' : 'cards');
    for (const item of section.items) {
      const card = node('article',undefined,'card');
      if(item.id) card.id = item.id;
      if(item.time) card.append(node('p',item.time,'item-time'));
      if(item.rating) {
        card.classList.add('recommended');
        const rating = node('span','★'.repeat(item.rating),'rating');
        rating.setAttribute('aria-label',`${page.ratingLabel || ''} ${item.rating}/3`);
        card.append(rating);
      }
      card.append(node('p',item.eyebrow,'eyebrow'),node('h3',item.title));
      if(item.meta) card.append(node('p',item.meta,'byline'));
      if(page.summaryLabel && item.id) card.append(node('p',page.summaryLabel,'summary-label'));
      const lines = node('div',undefined,'summary-lines');
      for (const line of item.lines) lines.append(node('p',line));
      card.append(lines);
      for(const ref of item.refs || []) {
        const a = node('a',ref.label + ' →','related-link'); a.href='#/'+ref.target;card.append(a);
      }
      for (const link of item.links) {
        const url = safeURL(link.url); if (!url) continue;
        const a = node('a', link.label + ' ↗','source-link'); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; a.referrerPolicy='no-referrer'; card.append(a);
      }
      grid.append(card);
    }
    block.append(grid); article.append(block);
  }
  const next = doc.pages[(doc.pages.indexOf(page)+1)%doc.pages.length];
  const nextLink = node('a',next.label + ' →','next-page'); nextLink.href='#/'+next.id; article.append(nextLink);
  main.append(article);
  if(id !== page.id) {
    const target = document.getElementById(id);
    if(target) { target.tabIndex=-1;target.classList.add('selected');target.focus({preventScroll:true});target.scrollIntoView({block:'center'}); }
  }
}
subscribe(render);
$('#privacy-toggle').addEventListener('click',()=>{if(isUnlocked()||dialog.open) cancel(); else openDialog();});
$('#dialog-close').addEventListener('click',cancel);
dialog.addEventListener('cancel',event=>{event.preventDefault();cancel();});
dialog.addEventListener('close',()=>{input.value=''; if(!isUnlocked()){attempt++;lock();}});
$('#unlock-form').addEventListener('submit',async event=>{
  event.preventDefault(); const current=++attempt;
  let password=input.value; input.value=''; $('#unlock-error').textContent=''; $('#unlock-submit').disabled=true;
  try {
    const pending=unlock(password); password=null;
    const ok=await pending;
    if(current!==attempt) return;
    if(ok){dialog.close();main.focus({preventScroll:true});window.scrollTo(0,0);}
  } catch {
    if(current===attempt) { lock(); $('#unlock-error').textContent='자료를 열 수 없습니다. 비밀번호와 파일을 확인해 주세요.'; input.focus(); }
  } finally {password=null;if(current===attempt) $('#unlock-submit').disabled=false;}
});
window.addEventListener('hashchange',()=>{window.scrollTo(0,0);render();});
window.addEventListener('pagehide',cancel);
window.addEventListener('pageshow',event=>{if(event.persisted) cancel();});
render();
