import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
export async function audit(root='dist',forbidden=[]){
  const files=[];async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else files.push(file);}}await walk(root);
  for(const file of files){
    if(/(?:\.xlsx?$|\.map$|(?:^|\/)\.private\/|password\.txt|source\.json|details\.json)/i.test(file))throw new Error('Forbidden file in web artifact');
    const content=await readFile(file,'utf8');
    if(forbidden.some(value=>value && content.includes(value)))throw new Error('Private plaintext detected in web artifact (value omitted)');
  }
  return files.length;
}
if(process.argv[1]===new URL(import.meta.url).pathname){
  let forbidden=[];
  for(const file of ['.private/forbidden.json','.private/password.txt']){
    try{const text=await readFile(file,'utf8');forbidden.push(...(file.endsWith('.json')?JSON.parse(text):[text.trim()]));}catch(err){if(err.code!=='ENOENT')throw err;}
  }
  try {
    const details=JSON.parse(await readFile('.private/details.json','utf8'));
    function collect(value){if(typeof value==='string' && value.length>=4)forbidden.push(value);else if(Array.isArray(value))value.forEach(collect);else if(value && typeof value==='object')Object.entries(value).filter(([key])=>!['id','layout'].includes(key)).forEach(([,v])=>collect(v));}
    collect(details);
  } catch(err) { if(err.code!=='ENOENT')throw err; }
  const count=await audit('dist',forbidden);
  console.log(`Audited ${count} production files. No source workbook, private plaintext, password, or source maps detected${forbidden.length?'':' (local private comparisons unavailable)'}.`);
}
