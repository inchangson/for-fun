import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { safeURL } from '../site/src/crypto.js';
import { nearbyFoods, distanceKm } from '../site/src/food.js';
const trip=JSON.parse(await readFile('site/src/trip.json','utf8'));
const refs=[];
function walk(x){if(!x||typeof x!=='object')return;for(const [k,v] of Object.entries(x)){if(k==='privateRef'||k==='departureRef'){if(v)refs.push(v);}else if(k==='arrivalRefs')refs.push(...v);else walk(v);}}
walk(trip);
assert.equal(trip.days.length,7,'Expected seven separate days');
assert.equal(new Set(refs).size,refs.length,'Private references must be unique');
for(const id of refs)assert.match(id,/^[a-f0-9]{32}$/,'Use opaque private references');
for(const d of trip.days){assert.equal(d.date,`2026-10-${String(d.number).padStart(2,'0')}`);for(const s of d.stops)assert.ok(trip.places[s.place]);for(const id of d.alternatives)assert.ok(trip.places[id]);}
for(const p of Object.values(trip.places)){assert.ok(p.lat>=35&&p.lat<=36);assert.ok(p.lng>=139&&p.lng<=140);}
for(const f of trip.foods){assert.ok(safeURL(f.map));if(f.website)assert.ok(safeURL(f.website));}
assert.equal(new Set(trip.foods.map(f=>f.id)).size,trip.foods.length,'Duplicate food place IDs');
for(const id of Object.keys(trip.places)){
 const foods=nearbyFoods(trip,id);
 assert.equal(foods.filter(f=>f.type==='restaurant').length,6,`Six restaurants required for ${id}`);
 assert.equal(foods.filter(f=>f.type==='cafe').length,4,`Four cafes required for ${id}`);
 assert.equal(new Set(foods.map(f=>f.id)).size,10,`Duplicate candidates for ${id}`);
 for(const f of foods){assert.ok(distanceKm(f,trip.places[id])<=1.5,'Candidate outside public search radius');assert.ok(f.rating>=1&&f.rating<=5&&Number.isInteger(f.reviews)&&f.reviews>0);assert.ok(safeURL(f.ratingSource)&&f.checkedAt&&f.address);}
}
for(const s of Object.values(trip.sources))assert.ok(safeURL(s.url));
const photos=JSON.parse(await readFile('site/src/photos.json','utf8'));
for(const p of Object.values(photos)){assert.ok(safeURL(p.src));assert.ok(p.author&&p.license&&safeURL(p.source)&&safeURL(p.licenseUrl));}
const encrypted=JSON.parse(await readFile('site/public/private.enc.json','utf8'));
assert.ok(encrypted.ciphertext&&encrypted.salt&&encrypted.iv);
try{const privateData=JSON.parse(await readFile('.private/details.json','utf8'));assert.ok(refs.every(id=>Object.hasOwn(privateData,id)),'Missing private record');}
catch(err){if(err.code!=='ENOENT')throw err;}
console.log('Validated days, references, public links and photo credits.');
