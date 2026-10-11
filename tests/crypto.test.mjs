import test from 'node:test';
import assert from 'node:assert/strict';
import {encrypt,decrypt,validPrivateData,safeURL} from '../site/src/crypto.js';
import {audit} from '../scripts/audit.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const password='test-only-password-not-for-production';
const data={version:1,title:'테스트 문서',subtitle:'검증용',pages:[{id:'a'.repeat(32),label:'테스트',kicker:'TEST',title:'한글',intro:'<img src=x onerror=alert(1)>',sections:[{title:'제목',body:'A'.repeat(150000),items:[{eyebrow:'TEST',title:'카드',lines:['한글 본문'],links:[{label:'링크',url:'https://example.com/'}]}]}]}]};
test('Crypto round-trips Unicode and large documents with fresh salt and IV',async()=>{const a=await encrypt(data,password),b=await encrypt(data,password);assert.notEqual(a.salt,b.salt);assert.notEqual(a.iv,b.iv);assert.notEqual(a.ciphertext,b.ciphertext);assert.deepEqual(await decrypt(a,password),data);assert.ok(validPrivateData(data));});
test('Wrong password, tampering and unsupported parameters fail closed',async()=>{const a=await encrypt(data,password);await assert.rejects(decrypt(a,'wrong'));await assert.rejects(decrypt({...a,ciphertext:(a.ciphertext[0]==='A'?'B':'A')+a.ciphertext.slice(1)},password));await assert.rejects(decrypt({...a,iterations:1},password));await assert.rejects(decrypt({...a,iv:'AA=='},password));});
test('Schema validates text, unique opaque IDs and HTTPS links',()=>{
 for(const url of ['javascript:alert(1)','https://u:p@example.com','//example.com','data:text/html,unsafe'])assert.equal(safeURL(url),null);
 assert.equal(validPrivateData({}),false);
 for(const mutate of [d=>d.pages.push(d.pages[0]),d=>d.pages[0].id='title-in-url',d=>d.pages[0].sections[0].items[0].lines=[{}],d=>d.pages[0].sections[0].items[0].links[0].url='javascript:alert(1)']){const d=structuredClone(data);mutate(d);assert.equal(validPrivateData(d),false);}
});
test('Artifact audit detects secrets and forbidden source files without printing values',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'private-audit-'));try{await writeFile(path.join(dir,'app.js'),'safe');assert.equal(await audit(dir,['secret-token']),1);await writeFile(path.join(dir,'app.js'),'secret-token');await assert.rejects(audit(dir,['secret-token']),/Private plaintext/);await writeFile(path.join(dir,'app.js'),'safe');await writeFile(path.join(dir,'source.xlsx'),'source');await assert.rejects(audit(dir),/Forbidden file/);}finally{await rm(dir,{recursive:true,force:true});}});
test('Record metadata and references fail closed when malformed or unresolved',()=>{
 const base=structuredClone(data);const item=base.pages[0].sections[0].items[0];item.id='b'.repeat(32);item.rating=3;item.refs=[{target:item.id,label:'Related record'}];base.pages[0].layout='timeline';
 assert.ok(validPrivateData(base));
 for(const mutate of [d=>d.pages[0].layout='unknown',d=>d.pages[0].sections[0].items[0].rating=4,d=>d.pages[0].sections[0].items[0].rating='3',d=>d.pages[0].sections[0].items[0].refs[0].target='c'.repeat(32),d=>d.pages[0].sections[0].items.push(d.pages[0].sections[0].items[0]),d=>d.pages[0].sections[0].items[0].id=d.pages[0].id,d=>d.pages[0].summaryLabel={}]){const value=structuredClone(base);mutate(value);assert.equal(validPrivateData(value),false);}
});
