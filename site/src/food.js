// Public destination coordinates only; distances are straight-line estimates.
export function distanceKm(a,b) {
 const rad=n=>n*Math.PI/180;
 return 6371*2*Math.asin(Math.sqrt(Math.sin(rad(a.lat-b.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(a.lng-b.lng)/2)**2));
}
export function nearbyFoods(trip,placeId) {
 const ids=trip.nearby?.[placeId] || [];
 return ids.map(id=>trip.foods.find(f=>f.id===id)).filter(Boolean).map(f=>({...f,distance:distanceKm(trip.places[placeId],f)}));
}
export const distanceLabel=km=>km<1?`${Math.round(km*1000)}m`:`${km.toFixed(1)}km`;

// Review-count shrinkage prevents a handful of perfect scores dominating a large sample.
export function candidateScore(food,place) {
 const weighted=(food.rating*food.reviews+4*200)/(food.reviews+200);
 return weighted-distanceKm(place,food)*0.55+(food.origin==='맛집쇼핑 시트'?0.18:0);
}
