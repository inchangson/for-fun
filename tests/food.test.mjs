import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {distanceKm,nearbyFoods,candidateScore} from '../site/src/food.js';
import {safeURL,decrypt} from '../site/src/crypto.js';
const trip=JSON.parse(await readFile('site/src/trip.json','utf8'));

test('current itinerary follows the itinerary sheet, preserving alternative destinations separately',()=>{
 const expected=[[],['nezu','watarium','spiral','omotesando','daikanyama','shibuya'],['mot','ginza','sony','ginza-six','ginza-place','artizon','shinjuku'],['palace','tokyo-station','forum','kitte','azabudai','borderless','odaiba'],['design','nact','takanawa','ebisu','brewery'],['western','ueno','tnm','asakusa'],['garden']];
 assert.deepEqual(trip.days.map(d=>d.stops.map(s=>s.place)),expected);
 const retained=new Set(trip.days.flatMap(d=>[...d.stops.map(s=>s.place),...d.alternatives]));
 for(const id of Object.keys(trip.places))assert.ok(retained.has(id),`Unreachable destination ${id}`);
});

test('every main and alternative destination has six restaurants and four cafes with valid public evidence',()=>{
 assert.equal(new Set(trip.foods.map(f=>f.id)).size,trip.foods.length);
 for(const id of Object.keys(trip.places)){
  const foods=nearbyFoods(trip,id);
  if(trip.places[id].nearbyStatus==='official-directory') {
   assert.ok(safeURL(trip.places[id].foodDirectory));assert.equal(foods.length,0);continue;
  }
  assert.equal(foods.length,10,id);assert.equal(new Set(foods.map(f=>f.id)).size,10,id);
  assert.equal(foods.filter(f=>f.type==='restaurant').length,6,id);
  assert.equal(foods.filter(f=>f.type==='cafe').length,4,id);
  for(const f of foods){
   assert.ok(distanceKm(trip.places[id],f)<=1.5,`${id} has a distant candidate`);
   assert.ok(Number.isFinite(f.rating)&&f.rating>=1&&f.rating<=5);
   assert.ok(Number.isInteger(f.reviews)&&f.reviews>0);
   assert.ok(safeURL(f.map)&&safeURL(f.ratingSource));
   assert.match(f.checkedAt,/^\d{4}-\d{2}-\d{2}$/);
   assert.ok(f.address&&f.ratingSourceLabel);
   assert.ok(!/골든가이|Omoide Yokocho|Ninja Experience|Owl Village|STARLIGHT NOVEL|Yadorigi Cafe/.test(f.name));
  }
 }
});

test('ratings account for review count and proximity; different branches retain separate identities',()=>{
 const point={lat:35.67,lng:139.76};
 assert.ok(candidateScore({...point,rating:4.6,reviews:2000},point)>candidateScore({...point,rating:5,reviews:5},point));
 assert.ok(candidateScore({...point,rating:4.5,reviews:500},point)>candidateScore({...point,lat:35.68,rating:4.5,reviews:500},point));
 const odaiba=nearbyFoods(trip,'odaiba');assert.ok(odaiba.some(f=>f.name.includes('AQUA CITY')));
 assert.ok(!odaiba.some(f=>f.name.includes('HARBOR')));
 assert.equal(new Set(odaiba.map(f=>f.map)).size,10);
});

test('production encrypted payload contains all current private records and matches the local source',async t=>{
 let password,data;
 try{password=(await readFile('.private/password.txt','utf8')).trim();data=JSON.parse(await readFile('.private/details.json','utf8'));}
 catch(e){if(e.code==='ENOENT'){t.skip('Local private source unavailable');return;}throw e;}
 const actual=await decrypt(JSON.parse(await readFile('site/public/private.enc.json','utf8')),password);password=null;
 // Boolean assertion keeps private text out of assertion diagnostics.
 assert.ok(JSON.stringify(actual)===JSON.stringify(data),'Encrypted payload and local source differ');
 const refs=[];const walk=x=>{if(!x||typeof x!=='object')return;for(const [k,v] of Object.entries(x)){if(k==='privateRef'||k==='departureRef'){if(v)refs.push(v);}else if(k==='arrivalRefs')refs.push(...v);else walk(v);}};walk(trip);
 assert.ok(refs.every(id=>Object.hasOwn(actual,id)),'Encrypted records missing current references');
});
