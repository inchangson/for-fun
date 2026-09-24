import test from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt, validPrivateData, safeURL } from '../site/src/crypto.js';
import { audit } from '../scripts/audit.mjs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const password='test-only-password-not-for-production';
const data={a:{title:'비공개 메모',lines:['한글 텍스트','A'.repeat(150000)],links:[{label:'예약',url:'https://example.com/reservation?token=private'}]}};
test('Web Crypto round-trips Unicode, links, and large drafts with fresh randomness',async()=>{
 const a=await encrypt(data,password),b=await encrypt(data,password);
 assert.notEqual(a.salt,b.salt);assert.notEqual(a.iv,b.iv);assert.notEqual(a.ciphertext,b.ciphertext);
 assert.deepEqual(await decrypt(a,password),data);assert.ok(validPrivateData(data));
});
test('Wrong password, modified ciphertext and unsupported parameters fail closed',async()=>{
 const a=await encrypt(data,password);await assert.rejects(decrypt(a,'wrong'));
 const changed={...a,ciphertext:(a.ciphertext[0]==='A'?'B':'A')+a.ciphertext.slice(1)};
 await assert.rejects(decrypt(changed,password));await assert.rejects(decrypt({...a,iterations:1},password));await assert.rejects(decrypt({...a,iv:'AA=='},password));
});
test('Private schema accepts text only and HTTPS URLs without credentials',()=>{
 assert.equal(safeURL('javascript:alert(1)'),null);assert.equal(safeURL('https://user:secret@example.com'),null);
 assert.equal(safeURL('//example.com'),null);assert.equal(validPrivateData({a:{...data.a,lines:[{}]}}),false);
 assert.equal(validPrivateData({a:{...data.a,links:[{label:'x',url:'data:text/html,unsafe'}]}}),false);
});
test('Artifact audit catches private values and source files without printing them',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tokyo-audit-'));
 try{await writeFile(path.join(dir,'app.js'),'safe content');assert.equal(await audit(dir,['secret-token']),1);
 await writeFile(path.join(dir,'app.js'),'secret-token');await assert.rejects(audit(dir,['secret-token']),/Private plaintext/);
 await writeFile(path.join(dir,'app.js'),'safe content');await writeFile(path.join(dir,'source.xlsx'),'source');await assert.rejects(audit(dir),/Forbidden file/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
