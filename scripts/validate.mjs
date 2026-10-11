import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { validPrivateData, decrypt, ITERATIONS } from '../site/src/crypto.js';
const envelope = JSON.parse(await readFile('site/public/private.enc.json','utf8'));
assert.equal(envelope.version,1);assert.equal(envelope.algorithm,'AES-256-GCM');assert.equal(envelope.kdf,'PBKDF2-SHA-256');assert.equal(envelope.iterations,ITERATIONS);
assert.equal(Buffer.from(envelope.salt,'base64').length,16);assert.equal(Buffer.from(envelope.iv,'base64').length,12);assert.ok(envelope.ciphertext);
try {
  const data=JSON.parse(await readFile('.private/details.json','utf8'));
  assert.ok(validPrivateData(data),'Invalid private document');
  let password=(await readFile('.private/password.txt','utf8')).trim();
  const decoded=await decrypt(envelope,password);password=null;
  assert.ok(JSON.stringify(decoded)===JSON.stringify(data),'Encrypted document is stale');
} catch(error) {if(error.code!=='ENOENT') throw error;}
console.log('Validated encrypted document format and available local source.');
