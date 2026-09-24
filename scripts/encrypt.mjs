import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { encrypt, validPrivateData } from '../site/src/crypto.js';
const data = JSON.parse(await readFile('.private/details.json', 'utf8'));
if (!validPrivateData(data)) throw new Error('Invalid private data. Text lines and HTTPS links required.');
let password;
await mkdir('.private', {recursive:true, mode:0o700});
if (process.argv.includes('--prompt')) {
  if (!process.stdin.isTTY) throw new Error('Use an interactive terminal for password input.');
  process.stdout.write('Encryption password (at least 8 characters; hidden): ');
  password = await new Promise((resolve, reject) => {
    let value=''; process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
    const finish=()=>{process.stdin.setRawMode(false);process.stdin.pause();process.stdin.off('data',handler);process.stdout.write('\n');};
    const handler=chunk=>{for(const ch of chunk){if(ch==='\u0003'){finish();reject(new Error('Cancelled'));return;}if(ch==='\r'||ch==='\n'){finish();resolve(value);return;}if(ch==='\u007f'){value=value.slice(0,-1);}else value+=ch;}};
    process.stdin.on('data',handler);
  });
} else {
  try { password = (await readFile('.private/password.txt', 'utf8')).trim(); }
  catch (err) { if(err.code !== 'ENOENT') throw err; password=randomBytes(24).toString('base64url'); await writeFile('.private/password.txt',password+'\n',{mode:0o600,flag:'wx'}); }
}
if (password.length < 8) throw new Error('Use at least 8 characters.');
const result = await encrypt(data,password);
await writeFile('site/public/private.enc.json', JSON.stringify(result));
if (process.argv.includes('--prompt')) await writeFile('.private/password.txt', password+'\n', {mode:0o600});
password = null;
console.log('Encrypted private details. Passwords and plaintext are not printed.');
