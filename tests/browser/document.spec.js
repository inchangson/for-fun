import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { encrypt } from '../../site/src/crypto.js';
const doc=JSON.parse(await readFile('.private/details.json','utf8'));
const password=(await readFile('.private/password.txt','utf8')).trim();
const privateStrings=[];
function collect(v){if(typeof v==='string' && v.length>=4)privateStrings.push(v);else if(Array.isArray(v))v.forEach(collect);else if(v&&typeof v==='object')Object.entries(v).filter(([k])=>k!=='id').forEach(([,x])=>collect(x));}collect(doc);
async function locked(page){expect(await page.locator('body').evaluate((el,values)=>values.some(v=>el.textContent.includes(v)),privateStrings)).toBe(false);await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','false');await expect(page.locator('.document')).toHaveCount(0);await expect(page.locator('a[href^="https:"]')).toHaveCount(0);}
async function open(page){await page.getByRole('switch').click();await page.getByLabel('비밀번호',{exact:true}).fill(password);await page.getByRole('button',{name:'열기 ↗',exact:true}).click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','true');}
// Close before Playwright's failure snapshot capture; never attach decrypted DOM.
test.afterEach(async({page})=>{await page.close();});
test('locked shell, password failure, all navigation, OFF, reload and storage',async({page})=>{
 const errors=[];page.on('pageerror',()=>errors.push(true));await page.goto('/');await locked(page);
 await page.getByRole('switch').click();await page.getByLabel('비밀번호',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'열기 ↗',exact:true}).click();await expect(page.locator('#unlock-error')).not.toBeEmpty();await locked(page);await page.getByRole('button',{name:'닫기',exact:true}).click();
 await open(page);
 for(let i=0;i<doc.pages.length;i++){
  await page.locator('#navigation a').nth(i).click();
  await expect.poll(async()=>await page.locator('h1').textContent()===doc.pages[i].title).toBe(true);
  await expect(page.locator('#navigation [aria-current="page"]')).toHaveCount(1);
  expect(await page.title()).toBe('비공개 자료');
 }
 await page.goBack();await expect(page.locator('.document')).toHaveCount(1);
 expect(await page.evaluate(()=>localStorage.length+sessionStorage.length)).toBe(0);
 expect(await page.locator('#password').inputValue()==='').toBe(true);
 await page.getByRole('switch').click();await locked(page);await open(page);await page.reload();await locked(page);
 expect(errors.length).toBe(0);
});
test('pending unlock cancellation, lifecycle, malformed and modified envelopes',async({page})=>{
 await page.goto('/');let release;const gate=new Promise(r=>release=r);
 await page.route('**/private.enc.json',async r=>{await gate;await r.continue();});
 await page.getByRole('switch').click();await page.getByLabel('비밀번호',{exact:true}).fill(password);await page.getByRole('button',{name:'열기 ↗',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();release();await page.waitForTimeout(1200);await locked(page);
 await page.unroute('**/private.enc.json');await open(page);
 await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await locked(page);
 await open(page);await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await locked(page);
 const envelope=JSON.parse(await readFile('site/public/private.enc.json','utf8'));
 envelope.ciphertext=(envelope.ciphertext[0]==='A'?'B':'A')+envelope.ciphertext.slice(1);
 for(const body of [envelope,{version:9},await encrypt({version:1,pages:[]},password)]){
  await page.route('**/private.enc.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(body)}));
  await page.getByRole('switch').click();await page.getByLabel('비밀번호',{exact:true}).fill(password);await page.getByRole('button',{name:'열기 ↗',exact:true}).click();await expect(page.locator('#unlock-error')).not.toBeEmpty();await locked(page);await page.getByRole('button',{name:'닫기',exact:true}).click();await page.unroute('**/private.enc.json');
 }
});
test('literal text rendering and no external requests before or after unlock',async({page})=>{
 const external=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173/'))external.push(true);});
 const fixture=structuredClone(doc);fixture.pages[0].sections[0].items[0].lines=['<img src=x onerror="window.injected=true">'];
 const body=await encrypt(fixture,password);
 await page.route('**/private.enc.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(body)}));
 await page.goto('/');await open(page);await expect(page.locator('.document img')).toHaveCount(0);expect(await page.evaluate(()=>window.injected===undefined)).toBe(true);expect(await page.locator('.document').textContent().then(x=>x.includes('<img src=x'))).toBe(true);expect(external.length).toBe(0);
});
test('mobile layout, keyboard dialog and opaque routes',async({page})=>{
 await page.goto('/');await page.getByRole('switch').focus();await page.keyboard.press('Enter');await expect(page.locator('#password')).toBeFocused();await page.keyboard.press('Escape');await locked(page);
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:900});await page.goto('/');await locked(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await open(page);
  for(let i=0;i<doc.pages.length;i++){await page.locator('#navigation a').nth(i).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(/^#\/[a-f0-9]{32}$/.test(new URL(page.url()).hash)).toBe(true);}
 }
});
test('static subpath build, unlock and private-source exclusion',async({page})=>{
 const server=createServer(async(req,res)=>{try{const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!requested.startsWith('/for-fun/')){res.writeHead(404).end();return;}const file=path.resolve('dist',requested.slice('/for-fun/'.length)||'index.html');if(!file.startsWith(path.resolve('dist')+path.sep)){res.writeHead(403).end();return;}const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(4175,'127.0.0.1',resolve));
 try{await page.goto('http://127.0.0.1:4175/for-fun/');await locked(page);await open(page);await page.locator('#navigation a').nth(2).click();await expect(page.locator('.document')).toHaveCount(1);await page.reload();await locked(page);for(const p of ['.private/details.json','.private/password.txt','src/trip.json'])expect((await page.request.get('http://127.0.0.1:4175/for-fun/'+p)).status()).toBe(404);}finally{await new Promise(r=>server.close(r));}
});
