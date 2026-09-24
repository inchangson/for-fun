import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
const password=(await readFile('.private/password.txt','utf8')).trim();
const privateData=JSON.parse(await readFile('.private/details.json','utf8'));
const trip=JSON.parse(await readFile('site/src/trip.json','utf8'));
const marker=privateData[trip.privateRef].lines[0];
const locked=async page=>expect((await page.locator('body').textContent()).includes(marker)).toBe(false);
async function openPrivate(page){await page.getByRole('switch').click();await page.getByLabel('여행 비밀번호',{exact:true}).fill(password);await page.getByRole('button',{name:'표시하기'}).click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','true');}

test('separate pages, history, catalog filters, checklist persistence and no horizontal overflow',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('/');await page.locator('.skip-link').focus();await page.keyboard.press('Enter');await expect(page.locator('#main')).toBeFocused();await expect(page.locator('h1')).toContainText('10월의 기록');await expect(page.locator('.day-card')).toHaveCount(7);
 await page.locator('.day-card').nth(1).click();await expect(page.locator('h1')).toContainText(trip.days[1].title);await expect(page.locator('.stop-card')).toHaveCount(5);
 await page.reload();await expect(page.locator('h1')).toContainText(trip.days[1].title);
 await page.locator('.primary-nav').getByRole('link',{name:'먹고, 둘러보기'}).click();await expect(page.locator('.restaurant-card')).toHaveCount(21);
 await page.getByRole('button',{name:'긴자',exact:true}).click();await expect(page.locator('.restaurant-card')).toHaveCount(2);
 await page.getByRole('searchbox').fill('no-such-place');await expect(page.locator('.empty-state')).toBeVisible();
 await page.goto('/#/checklist');const first=page.locator('[data-check]').first();await first.check();await page.reload();await expect(first).toBeChecked();
 await page.getByRole('button',{name:'체크 초기화'}).click();await expect(first).not.toBeChecked();
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:900});for(const route of ['/', '/days/2026-10-02','/places','/checklist','/credits']){await page.goto('/#'+route);await expect(page.locator('h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}}
 expect(errors).toEqual([]);
});

test('correct unlock, failed password, cross-page state, lock, reload, and stored values',async({page})=>{
 await page.goto('/');await locked(page);
 await page.getByRole('switch').click();await page.getByLabel('여행 비밀번호',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'표시하기'}).click();await expect(page.locator('#unlock-error')).not.toBeEmpty();await locked(page);await page.getByRole('button',{name:'닫기',exact:true}).click();
 await openPrivate(page);expect((await page.locator('body').textContent()).includes(marker)).toBe(true);
 await page.locator('.primary-nav').getByRole('link',{name:'일자별 일정'}).click();await expect(page.locator('.private-content')).not.toHaveCount(0);await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','true');
 expect(await page.evaluate(secrets=>Object.values({...localStorage,...sessionStorage}).some(value=>secrets.some(secret=>value.includes(secret))),[password,...Object.values(privateData).flatMap(item=>item.lines).filter(line=>line.length>=8)])).toBe(false);
 await page.getByRole('switch').click();await expect(page.locator('.private-content')).toHaveCount(0);expect(await page.locator('a').evaluateAll((links,privateURLs)=>links.some(a=>privateURLs.includes(a.href)),privateData[trip.privateRef].links.map(link=>link.url))).toBe(false);
 await openPrivate(page);await page.reload();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','false');await expect(page.locator('.private-content')).toHaveCount(0);
});

test('closing a pending unlock cancels late plaintext, page lifecycle locks, and tampered data fails',async({page})=>{
 await page.goto('/');let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/private.enc.json',async route=>{await gate;await route.continue();});
 await page.getByRole('switch').click();await page.getByLabel('여행 비밀번호',{exact:true}).fill(password);await page.getByRole('button',{name:'표시하기'}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();release();await page.waitForTimeout(500);await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','false');await expect(page.locator('.private-content')).toHaveCount(0);
 await page.unroute('**/private.enc.json');await openPrivate(page);await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await locked(page);await expect(page.locator('.private-content')).toHaveCount(0);
 await page.route('**/private.enc.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({version:9})}));await page.getByRole('switch').click();await page.getByLabel('여행 비밀번호',{exact:true}).fill(password);await page.getByRole('button',{name:'표시하기'}).click();await expect(page.locator('#unlock-error')).not.toBeEmpty();await expect(page.locator('.private-content')).toHaveCount(0);
});

test('all seven dates, public map markers, fallback links, unknown page, keyboard dialog',async({page})=>{
 for(const day of trip.days){await page.goto('/#'+`/days/${day.date}`);await expect(page.locator('h1')).toHaveText(day.title);await expect(page.locator('.day-navigation [aria-current=page]')).toHaveCount(1);if(day.stops.length){await expect(page.locator('.map-marker')).toHaveCount(day.stops.length);await expect(page.locator('.map-fallback-links a')).toHaveCount(day.stops.length);}await locked(page);}
 await page.goto('/#/days/2026-10-02');await page.getByRole('button',{name:'지도에서 보기'}).first().click();await expect(page.locator('.leaflet-popup')).toBeVisible();
 await page.getByRole('switch').focus();await page.keyboard.press('Enter');await expect(page.locator('#password')).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('#unlock-dialog')).not.toBeVisible();
 await page.goto('/#/missing');await expect(page.locator('h1')).toContainText('아직 없어요');
});

test('unavailable photos and tiles leave usable public content',async({page})=>{
 await page.route('https://*.wikimedia.org/**',r=>r.abort());await page.route('https://tile.openstreetmap.org/**',r=>r.abort());
 await page.goto('/#/days/2026-10-02');await expect(page.locator('.photo-fallback')).toBeVisible();await expect(page.locator('.map-fallback-links a')).toHaveCount(5);await expect(page.locator('.stop-card')).toHaveCount(5);
});

test('production assets support static subpath hosting and contain no private source routes',async({page})=>{
 const server=createServer(async(req,res)=>{try{const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!requested.startsWith('/for-fun/')){res.writeHead(404).end();return;}const relative=requested.slice('/for-fun/'.length)||'index.html';const file=path.resolve('dist',relative);if(!file.startsWith(path.resolve('dist')+path.sep)){res.writeHead(403).end();return;}const content=await readFile(file);const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[ext]||'application/octet-stream');res.end(content);}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(4175,'127.0.0.1',resolve));
 try{await page.goto('http://127.0.0.1:4175/for-fun/#/days/2026-10-03');await expect(page.locator('h1')).toHaveText(trip.days[2].title);await expect(page.locator('.map-marker')).toHaveCount(5);const response=await page.request.get('http://127.0.0.1:4175/for-fun/.private/details.json');expect(response.status()).toBe(404);await openPrivate(page);await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','true');}finally{await new Promise(resolve=>server.close(resolve));}
});

test('capture locked desktop and mobile layout for visual review',async({page})=>{
 await page.goto('/');await expect(page.locator('.hero-photo img')).toBeVisible();for(const photo of await page.locator('.photo img').all()){await photo.scrollIntoViewIfNeeded();await expect.poll(()=>photo.evaluate(img=>img.complete&&img.naturalWidth>0),{timeout:12000}).toBe(true);}await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/tokyo-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.goto('/#/days/2026-10-02');await page.waitForTimeout(1200);await page.screenshot({path:'/tmp/tokyo-mobile.png',fullPage:true});
 const loaded=await page.locator('.day-photo img').evaluate(img=>({loaded:img.complete&&img.naturalWidth>0,url:img.currentSrc}));console.log('Remote day photograph loaded:',loaded.loaded);
});


test('development server does not expose private source files',async({page})=>{
 const {createServer:createViteServer}=await import('vite');
 const server=await createViteServer({server:{port:4176,host:'127.0.0.1',strictPort:true}});await server.listen();
 try{
  await page.goto('http://127.0.0.1:4176/');await expect(page.locator('h1')).toContainText('10월의 기록');
  for(const file of ['/.private/details.json','/@fs'+path.resolve('.private/details.json'),'/%2e%2e/.private/password.txt']){
   const response=await page.request.get('http://127.0.0.1:4176'+file);
   const body=await response.text();expect(body.includes(marker)||body.includes(password)).toBe(false);
  }
 }finally{await server.close();}
});
