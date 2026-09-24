import './styles.css';
import 'leaflet/dist/leaflet.css';
import trip from './trip.json';
import photos from './photos.json';
import { lock, unlock, isUnlocked, subscribe } from './privacy.js';
import { safeURL } from './crypto.js';

const $ = (selector,root=document)=>root.querySelector(selector);
const $$ = (selector,root=document)=>[...root.querySelectorAll(selector)];
const esc = value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = (url,label,cls='text-link')=>safeURL(url)?`<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span></a>`:'';
const mapLink = p=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query)}`;
const pad = n=>String(n).padStart(2,'0');
const privateElement = (id,label='상세 시간 · 비공개')=>`<private-detail data-ref="${esc(id)}" data-label="${esc(label)}"></private-detail>`;
const dayURL = day=>`#/days/${day.date}`;
let renderId=0,map=null,markers=new Map(),toastTimer;
const requiredIds=[];
function collectRefs(obj) {
  if (!obj || typeof obj!=='object') return;
  for (const [key,value] of Object.entries(obj)) {
    if (key==='privateRef'||key==='departureRef') { if(value) requiredIds.push(value); }
    else if(key==='arrivalRefs') requiredIds.push(...value);
    else collectRefs(value);
  }
}
collectRefs(trip);
function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500); }
function photo(key,cls='',eager=false,linkedCredit=true) {
  const p=photos[key];
  return `<figure class="photo ${cls}" data-photo="${key}"><img src="${esc(p.src)}" data-fallback="${esc(p.fallback)}" alt="${esc(p.alt)}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async"><figcaption>${linkedCredit?external(p.source,`PHOTO · ${esc(p.author)}`,'photo-credit'):`<span class="photo-credit">PHOTO · ${esc(p.author)}</span>`}</figcaption><span class="photo-fallback" hidden>${esc(p.alt)}<small>사진을 불러오지 못했어요</small></span></figure>`;
}
function connectPhotos() {
  $$('.photo img').forEach(img=>{
    const fail=()=>{
      if (img.dataset.fallback && img.src!==img.dataset.fallback) { img.src=img.dataset.fallback; delete img.dataset.fallback; return; }
      img.hidden=true; $('.photo-fallback',img.parentElement).hidden=false;
    };
    img.addEventListener('error',fail);
    if(img.complete && img.naturalWidth===0) fail();
  });
}
function dayCard(day) {
  return `<a href="${dayURL(day)}" class="day-card">
    <div class="day-card-photo">${photo(day.photo,'',false,false)}<span class="day-badge">DAY ${pad(day.number)}</span><span class="card-arrow" aria-hidden="true">↗</span></div>
    <div class="day-card-meta"><span>OCT ${pad(day.number)} <i>· ${day.weekday}요일</i></span><span>${day.stops.length ? `${day.stops.length} PLACES`:'ARRIVAL'}</span></div>
    <h3>${esc(day.title)}</h3><p>${esc(day.area)}</p></a>`;
}
function mapBlock(places,overview=false) {
  return `<section class="map-section" aria-labelledby="map-title"><div class="section-heading compact"><div><p class="eyebrow">${overview?'THE CITY AT A GLANCE':'FOLLOW THE DAY'}</p><h2 id="map-title">${overview?'이번 여행의 도쿄':'오늘의 동선'}</h2></div><span class="map-count">${places.length}곳</span></div>
    <div id="trip-map" class="map-canvas" role="region" aria-label="${overview?'여행 관광지':'당일 방문 순서'} 지도"><p class="map-loading">지도를 불러오는 중…</p></div>
    <p class="map-caption">${overview?'관광지의 위치를 한눈에 살펴보세요.':'점선은 방문 순서이며 실제 길찾기 경로가 아닙니다.'} 장소를 누르면 지도 앱으로 연결됩니다.</p>
    <div class="map-fallback-links">${places.map((p,i)=>external(mapLink(p),`<span>${pad(i+1)}</span> ${esc(p.name)}`)).join('')}</div></section>`;
}
async function initMap(places,overview=false) {
  if(!places.length || !$('#trip-map')) return;
  const current=renderId;
  try {
    const L=await import('leaflet'); if(current!==renderId) return;
    const element=$('#trip-map'); element.replaceChildren();
    map=L.map(element,{scrollWheelZoom:false,zoomControl:true});
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',maxZoom:19});
    let failed=0;
    tiles.on('tileerror',()=>{if(++failed===3 && current===renderId){element.classList.add('tiles-unavailable');const notice=document.createElement('p');notice.className='tile-notice';notice.textContent='地図 · 배경 지도를 불러오지 못했어요. 아래 장소 링크를 이용하세요.';element.append(notice);}});
    tiles.addTo(map); markers=new Map();
    places.forEach((p,i)=>{
      const icon=L.divIcon({className:'map-marker',html:`<span>${overview?'•':i+1}</span>`,iconSize:[30,30],iconAnchor:[15,15]});
      const marker=L.marker([p.lat,p.lng],{icon,title:p.name,keyboard:true}).addTo(map);
      const popup=document.createElement('div'); const title=document.createElement('strong'); title.textContent=p.name;
      const link=document.createElement('a');link.href=mapLink(p);link.target='_blank';link.rel='noopener noreferrer';link.textContent='지도 앱에서 보기 ↗';popup.append(title,link);marker.bindPopup(popup);markers.set(p.id,marker);
      marker.on('click',()=>{$$('.stop-card').forEach(el=>el.classList.toggle('highlight',el.dataset.place===p.id));});
    });
    if(!overview && places.length>1) L.polyline(places.map(p=>[p.lat,p.lng]),{color:'#bc4c35',weight:2,dashArray:'5,9',opacity:.65}).addTo(map);
    if(places.length===1) map.setView([places[0].lat,places[0].lng],14); else map.fitBounds(places.map(p=>[p.lat,p.lng]),{padding:[35,35],maxZoom:14});
  } catch { if(current===renderId && $('#trip-map')) $('#trip-map').textContent='지도를 불러오지 못했어요. 아래 장소 링크로 위치를 확인하세요.'; }
}
function home() {
  const publicPlaces=[...new Set(trip.days.flatMap(d=>d.stops.map(s=>s.place)))].map(id=>trip.places[id]);
  $('#main').innerHTML=`<div class="page-container home-page">
    <div class="issue-line"><span>TRAVEL JOURNAL / VOL. 01</span><span>OCTOBER 1—7, 2026 <span class="red-dot"></span> JAPAN</span></div>
    <section class="home-intro"><div><p class="eyebrow">SEVEN DAYS, A THOUSAND LITTLE MOMENTS</p><h1>도쿄,<br>10월의 기록<span class="red-dot"></span></h1></div><div class="intro-aside"><span class="japanese-note" lang="ja">東京、秋のはじまり。</span><p>미술관에서 골목으로, 골목에서 바다로.<br>좋아하는 풍경을 따라 걷는 일주일.</p><a class="button outlined" href="${dayURL(trip.days[0])}">첫날부터 둘러보기 <span>↗</span></a></div></section>
    <div class="hero-photo-wrap">${photo('hero','hero-photo',true)}<span class="hero-wordmark" aria-hidden="true">TOKYO</span><div class="hero-photo-label"><span>35°40′ N &nbsp; 139°45′ E</span><span>천천히, 우리만의 속도로.</span></div></div>
    <section class="trip-strip" aria-label="여행 개요"><div><span class="eyebrow">WHEN</span><strong>10.01 <span>—</span> 10.07</strong><small>2026년 · 목요일부터 수요일까지</small></div><div><span class="eyebrow">HOW LONG</span><strong>6박 7일</strong><small>예술 · 건축 · 맛있는 한 끼</small></div><div><span class="eyebrow">OUR NOTES</span>${privateElement(trip.privateRef,'숙소 · 항공 정보 보기')}</div></section>
    <section class="itinerary-section"><div class="section-heading"><div><p class="eyebrow">ONE DAY AT A TIME</p><h2>일곱 날, 일곱 개의 장면</h2></div><p>하루를 골라 여행을 펼쳐보세요.<br>자세한 일정과 지도는 날짜별로 모았어요.</p></div><div class="days-grid">${trip.days.map(dayCard).join('')}</div></section>
    <div class="home-bottom">${mapBlock(publicPlaces,true)}<aside class="travel-note"><span class="note-cross" aria-hidden="true">✳</span><p class="eyebrow">BEFORE WE GO</p><h2>가볍게 떠나기 위한<br>작은 준비들.</h2><p>꼭 챙겨야 할 것들과<br>가보고 싶은 식당을 한곳에.</p><a href="#/checklist">출발 전 체크리스트 <span>↗</span></a><a href="#/places">먹고, 둘러보기 <span>↗</span></a><div class="note-foot">계획은 길을 잃지 않을 만큼만.<br>나머지는 그날의 기분대로.</div></aside></div>
  </div>`;
  initMap(publicPlaces,true);
}
function dayNav(day) {
  return `<nav class="day-navigation" aria-label="일자 선택"><a href="#/" class="day-nav-home" aria-label="여행 개요">← <span>전체 여행</span></a>${trip.days.map(d=>`<a href="${dayURL(d)}" ${day.number===d.number?'aria-current="page"':''}><span>DAY ${pad(d.number)}</span><strong>10.${pad(d.number)} <small>${d.weekday}</small></strong></a>`).join('')}</nav>`;
}
function placeSource(p) {
  const s=trip.sources[p.source];
  return s?`<div class="source-note"><span class="tiny-dot ${s.checked?'':'unconfirmed'}"></span><span>${esc(s.note)} ${external(s.url,s.checked?'공식 안내':'확인 필요')}</span></div>`:'';
}
function stopCard(stop,i) {
  const p=trip.places[stop.place];
  return `<article class="stop-card" data-place="${p.id}"><div class="stop-number">${pad(i+1)}</div><div class="stop-content"><div class="stop-category">${p.category}</div><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>${placeSource(p)}${privateElement(stop.privateRef)}<div class="stop-actions"><button class="text-link" data-focus-place="${p.id}">지도에서 보기 <span>⌖</span></button>${external(mapLink(p),'길찾기')}</div></div></article>`;
}
function dayPage(day) {
  const places=day.stops.map(s=>trip.places[s.place]);
  const foods=trip.foods.filter(f=>day.foodAreas.includes(f.area));
  const prev=trip.days[day.number-2],next=trip.days[day.number];
  $('#main').innerHTML=`<div class="page-container day-page">${dayNav(day)}
    <section class="day-heading"><div><p class="eyebrow">DAY ${pad(day.number)} / ${day.kicker}</p><h1>${esc(day.title)}</h1><p>${esc(day.description)}</p></div><div class="date-stamp"><strong>OCT<span>${pad(day.number)}</span></strong><small>2026 · ${day.weekday}요일</small></div></section>
    <div class="day-photo-wrap">${photo(day.photo,'day-photo',true)}<div class="day-photo-caption"><span>${esc(day.area)}</span><span>${places.length?'CITY WALK':'ARRIVAL NOTES'} / TOKYO</span></div></div>
    <div class="day-body"><section class="timeline"><div class="section-heading compact"><div><p class="eyebrow">TODAY'S CHAPTER</p><h2>${places.length?'오늘은 이 순서로':'여행의 시작'}</h2></div><span class="muted">일본 현지 기준</span></div>
      ${day.arrivalRefs?day.arrivalRefs.map((ref,i)=>`<article class="stop-card"><div class="stop-number">${pad(i+1)}</div><div class="stop-content"><p class="stop-category">${['ARRIVAL','CHECK IN','TAKE A REST'][i]}</p><h3>${['도쿄에 도착','도시로 이동하기','첫 저녁, 그리고 휴식'][i]}</h3><p>${['입국 준비를 마치고 여행을 시작해요.','이동과 체크인 정보는 비공개 상세에서 확인하세요.','늦은 밤에는 무리하지 않고 가볍게 먹어요.'][i]}</p>${privateElement(ref,'이동 · 상세 정보 보기')}</div></article>`).join(''):day.stops.map(stopCard).join('')}
      ${day.departureRef?`<article class="stop-card"><div class="stop-number">02</div><div class="stop-content"><p class="stop-category">DEPARTURE</p><h3>짐을 챙기고, 공항으로</h3><p>마지막 날은 출국을 우선해요. 정원은 이동 여유가 있을 때만 짧게 둘러봅니다.</p>${privateElement(day.departureRef,'항공 · 공항 이동 보기')}</div></article>`:''}
    </section><aside class="day-sidebar">${places.length?mapBlock(places):`<div class="arrival-aside"><span class="big-kanji" lang="ja">旅</span><p class="eyebrow">THE BEGINNING</p><h2>잘 도착하는 것도<br>여행의 일부.</h2><p>오늘은 짐을 풀고 푹 쉬어요.<br>내일은 미술관에서 시작합니다.</p><a class="text-link" href="${dayURL(trip.days[1])}">내일 일정 보기 ↗</a></div>`}<div class="editor-note"><p class="eyebrow">PLAN NOTES</p><h3>초안에서 다듬은 부분</h3><p>${esc(day.note)}</p><small>운영 정보 확인 ${trip.checkedAt.replaceAll('-','.')} · 이동·입장 상황에 따라 조정</small></div></aside></div>
    ${day.alternatives.length?`<section class="alternatives-section"><div class="section-heading"><div><p class="eyebrow">A LITTLE DETOUR</p><h2>시간이 맞으면, 이곳도</h2></div><p>본 일정에 더하기보다 바꿔 넣을 수 있는 후보예요.</p></div><div class="alternative-grid">${day.alternatives.map(id=>{const p=trip.places[id];return `<article class="alternative-card"><span class="eyebrow">${p.category} / ${id==='mori'?'관람 제외':'선택 코스'}</span><h3>${p.name}</h3><p>${esc(p.description)}</p>${placeSource(p)}${external(mapLink(p),'위치 보기')}</article>`;}).join('')}</div></section>`:''}
    ${foods.length?`<section class="day-food"><div class="section-heading"><div><p class="eyebrow">A TABLE ALONG THE WAY</p><h2>이날의 식사 후보</h2></div><a class="text-link" href="#/places">전체 후보 보기 ↗</a></div><div class="food-mini-grid">${foods.slice(0,4).map(f=>`<article><span class="eyebrow">${esc(f.area)} · ${esc(f.kind)}</span><h3>${esc(f.name)}</h3>${external(f.map,'지도에서 보기')}</article>`).join('')}</div></section>`:''}
    <section class="private-notes"><div><p class="eyebrow">OUR PRIVATE NOTES</p><h2>함께 보는 메모</h2><p>개인 참고사항과 엑셀 초안의 기록.</p></div>${privateElement(day.privateRef,'개인 메모 펼치기')}</section>
    <nav class="prev-next" aria-label="이전 다음 일정">${prev?`<a href="${dayURL(prev)}"><span>← DAY ${pad(prev.number)}</span><strong>${prev.title}</strong></a>`:'<a href="#/"><span>← OVERVIEW</span><strong>전체 여행 보기</strong></a>'}${next?`<a href="${dayURL(next)}"><span>DAY ${pad(next.number)} →</span><strong>${next.title}</strong></a>`:'<a href="#/checklist"><span>BEFORE WE GO →</span><strong>출발 준비 확인하기</strong></a>'}</nav>
  </div>`;
  initMap(places);
  $$('[data-focus-place]').forEach(button=>button.addEventListener('click',()=>{
    const marker=markers.get(button.dataset.focusPlace);
    if (marker && map) { map.setView(marker.getLatLng(),15); marker.openPopup(); $('#trip-map').scrollIntoView({behavior:'smooth',block:'center'}); }
    else toast('지도를 준비 중이에요. 길찾기 링크로도 확인할 수 있어요.');
  }));
}
const shoppingIds=['omotesando','spiral','kitte','ginza','midtown','azabudai'];
let catalogType='food',catalogArea='전체',catalogQuery='';
function catalogPage() {
  $('#main').innerHTML=`<div class="page-container collection-page"><div class="issue-line"><span>THE LITTLE ADDRESS BOOK</span><span>TOKYO / EAT & EXPLORE</span></div><section class="collection-heading"><p class="eyebrow">GOOD FOOD, GOOD FINDS</p><h1>먹고, 둘러보기<span class="red-dot"></span></h1><p>걷다가 배가 고파지면, 마음에 드는 가게가 궁금해지면.<br>여행길에 꺼내 보는 작은 주소록.</p></section><div class="catalog-bar"><div class="segmented" aria-label="목록 종류"><button data-catalog="food">맛집 후보 <span>${trip.foods.length}</span></button><button data-catalog="shopping">쇼핑 산책 <span>${shoppingIds.length}</span></button></div><label class="search-field"><span aria-hidden="true">⌕</span><span class="sr-only">이름이나 메뉴 검색</span><input id="catalog-search" type="search" placeholder="이름이나 메뉴로 찾아보기" value="${esc(catalogQuery)}"></label></div><div id="area-filters" class="filter-chips" aria-label="지역 필터"></div><div class="catalog-summary"><span id="catalog-count" role="status"></span><span>영업시간·평점은 엑셀 초안 기록 · 방문 전 재확인</span></div><div id="catalog-results"></div></div>`;
  $$('[data-catalog]').forEach(b=>b.addEventListener('click',()=>{catalogType=b.dataset.catalog;catalogArea='전체';renderCatalog();}));
  $('#catalog-search').addEventListener('input',e=>{catalogQuery=e.target.value;renderCatalog();});
  renderCatalog();
}
function renderCatalog() {
  $$('[data-catalog]').forEach(b=>{b.classList.toggle('active',b.dataset.catalog===catalogType);b.setAttribute('aria-pressed',String(b.dataset.catalog===catalogType));});
  const areas=catalogType==='food'?['전체',...new Set(trip.foods.map(f=>f.area))]:['전체'];
  $('#area-filters').innerHTML=areas.map(a=>`<button data-area="${esc(a)}" class="${catalogArea===a?'active':''}" aria-pressed="${catalogArea===a}">${esc(a)}</button>`).join('');
  $$('[data-area]').forEach(b=>b.addEventListener('click',()=>{catalogArea=b.dataset.area;renderCatalog();}));
  const query=catalogQuery.trim().toLocaleLowerCase();
  if(catalogType==='food') {
    const result=trip.foods.filter(f=>(catalogArea==='전체'||f.area===catalogArea)&&`${f.name} ${f.kind} ${f.area}`.toLocaleLowerCase().includes(query));
    $('#catalog-count').textContent=`${result.length}개의 식사 후보`;
    $('#catalog-results').innerHTML=result.length?`<div class="restaurant-grid">${result.map((f,i)=>`<article class="restaurant-card"><div class="restaurant-top"><span class="eyebrow">${esc(f.area)} / ${esc(f.kind)}</span><span class="restaurant-index">${pad(i+1)}</span></div><h2>${esc(f.name)}</h2><div class="restaurant-info"><p><span>초안 영업시간</span>${esc(f.hours)}</p>${f.rating?`<p><span>초안 평점</span>☆ ${esc(f.rating)}</p>`:''}</div>${f.note?`<p class="restaurant-note">${esc(f.note)}</p>`:''}${f.privateRef?privateElement(f.privateRef,'개인 참고 메모'):''}<div class="restaurant-links">${external(f.map,'지도 열기')}${f.website?external(f.website,'매장 안내'):''}</div></article>`).join('')}</div>`:emptyState();
  } else {
    const result=shoppingIds.map(id=>trip.places[id]).filter(p=>`${p.name} ${p.description}`.toLocaleLowerCase().includes(query));
    $('#catalog-count').textContent=`${result.length}곳의 쇼핑 산책`;
    $('#catalog-results').innerHTML=`<p class="shopping-note">구매할 물건은 아직 정하지 않았어요. 초안의 빈 쇼핑 목록 대신 일정 속 쇼핑 장소를 모았습니다.</p>${result.length?`<div class="alternative-grid">${result.map(p=>`<article class="alternative-card"><span class="eyebrow">${p.category}</span><h2>${p.name}</h2><p>${p.description}</p>${external(mapLink(p),'위치 보기')}</article>`).join('')}</div>`:emptyState()}`;
  }
}
function emptyState(){return '<div class="empty-state"><span>⌕</span><h2>아직 찾지 못했어요</h2><p>다른 검색어나 지역을 골라보세요.</p></div>';}
const STORAGE_KEY='tokyoOctober2026.checklist.v1';
function readChecks(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(trip.checklist.map(c=>[c.id,x[c.id]===true])):{};}catch{return {};}}
function checklistPage(){
  const checks=readChecks();
  $('#main').innerHTML=`<div class="page-container checklist-page"><div class="issue-line"><span>BEFORE THE FIRST STEP</span><span>A LITTLE PREPARATION</span></div><section class="collection-heading"><p class="eyebrow">PACK LIGHT, TRAVEL WELL</p><h1>마음은 가볍게,<br>준비는 차근차근<span class="red-dot"></span></h1><p>출발 전 하나씩 체크해요.<br>체크한 항목은 지금 사용하는 브라우저에만 저장됩니다.</p></section><div class="checklist-layout"><section class="checklist-panel"><div class="check-progress"><span>출발 전 체크리스트</span><strong id="check-count"></strong></div><div class="progress-track"><span id="check-progress-bar"></span></div><div class="check-items">${trip.checklist.map((c,i)=>`<label class="check-item"><input type="checkbox" data-check="${c.id}" ${checks[c.id]?'checked':''}><span class="custom-check" aria-hidden="true">✓</span><span class="check-label">${esc(c.label)}</span><span class="check-index">${pad(i+1)}</span></label>`).join('')}</div><div class="check-footer"><span id="check-save-status" role="status">이 기기에 저장</span><button class="text-link" id="reset-checks">체크 초기화 ↺</button></div></section><aside class="packing-note"><span class="packing-icon" aria-hidden="true">旅</span><p class="eyebrow">LESS LUGGAGE, MORE MEMORIES</p><h2>잊지 말아야 할 건,<br>설레는 마음.</h2><p>준비물은 엑셀 초안에서 가져왔어요.<br>공동 체크리스트가 아니라<br>이 브라우저만의 준비 기록입니다.</p>${privateElement(trip.privateRef,'숙소 · 항공 다시 확인')}</aside></div></div>`;
  const update=()=>{const count=$$('[data-check]:checked').length;$('#check-count').textContent=`${count} / ${trip.checklist.length}`;$('#check-progress-bar').style.width=`${count/trip.checklist.length*100}%`;};
  const save=()=>{const data=Object.fromEntries($$('[data-check]').map(el=>[el.dataset.check,el.checked]));try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));$('#check-save-status').textContent='방금 이 기기에 저장했어요';}catch{$('#check-save-status').textContent='저장할 수 없어 이번 화면에서만 유지돼요';}update();};
  $$('[data-check]').forEach(el=>el.addEventListener('change',save));
  $('#reset-checks').addEventListener('click',()=>{$$('[data-check]').forEach(el=>el.checked=false);save();toast('체크 표시를 초기화했어요.');});update();
}
function creditsPage(){
 $('#main').innerHTML=`<div class="page-container credits-page"><div class="collection-heading"><p class="eyebrow">WITH THANKS</p><h1>풍경과 정보의 출처</h1><p>사진은 Wikimedia Commons의 원본 URL에서 불러옵니다.<br>공식 운영 정보 확인일 ${trip.checkedAt} · 방문 전 최신 안내를 다시 확인해 주세요.</p></div><h2 class="credits-heading">사진</h2><div class="credits-grid">${Object.entries(photos).map(([key,p])=>`<article>${photo(key)}<h3>${esc(p.alt)}</h3><p>${esc(p.author)} · ${esc(p.license)}</p><small>${esc(p.changes)}</small><div>${external(p.source,'원본·저작자')}${external(p.licenseUrl,'라이선스')}</div></article>`).join('')}</div><h2 class="credits-heading">운영 정보와 전시</h2><div class="source-list">${Object.values(trip.sources).map(s=>`<article><h3>${external(s.url,esc(s.title))}</h3><p>${esc(s.note)}</p><small>${s.checked?'공식 안내 확인':'확인 필요'} · ${trip.checkedAt}</small></article>`).join('')}</div><h2 class="credits-heading">지도와 초안</h2><p>지도 데이터 © OpenStreetMap contributors. 지도에 표시한 지점은 관광지의 참고 위치이며 방문 순서 연결선은 실제 이동 경로가 아닙니다.</p>${external('https://www.openstreetmap.org/copyright','OpenStreetMap 저작권 안내')}<p>일정·식당·준비물의 출발점은 제공된 도쿄 여행 엑셀 초안입니다. 식당 영업시간과 평점은 초안 기록이며 최신 정보로 검증된 값이 아닙니다.</p></div>`;
}
function route(){
 renderId++; if(map){map.remove();map=null;}markers.clear();
 const path=(location.hash.slice(1)||'/').split('?')[0];let nav='home';
 if(path==='/'){home();document.title='도쿄, 10월의 기록 — Tokyo in October';}
 else if(path.startsWith('/days/')){const day=trip.days.find(d=>dayURL(d).slice(1)===path);if(day){dayPage(day);document.title=`DAY ${pad(day.number)} · ${day.title} — TOKYO`;nav='days';}else notFound();}
 else if(path==='/places'){catalogPage();nav='places';document.title='먹고, 둘러보기 — TOKYO';}
 else if(path==='/checklist'){checklistPage();nav='checklist';document.title='여행 준비 — TOKYO';}
 else if(path==='/credits'){creditsPage();document.title='사진·정보 출처 — TOKYO';}
 else notFound();
 $$('[data-nav]').forEach(a=>{if(a.dataset.nav===nav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 connectPhotos();window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});
}
function notFound(){$('#main').innerHTML='<section class="not-found page-container"><p class="eyebrow">A SMALL DETOUR</p><h1>이 페이지는 아직 없어요.</h1><a href="#/" class="button dark">여행 개요로 돌아가기 ↗</a></section>';document.title='페이지를 찾을 수 없어요 — TOKYO';}
const dialog=$('#unlock-dialog'),passwordInput=$('#password'),submit=$('#unlock-submit');
let uiGeneration=0;
function resetDialog(){uiGeneration++;passwordInput.value='';passwordInput.disabled=false;submit.disabled=false;submit.innerHTML='표시하기 <span>↗</span>';$('#unlock-error').textContent='';}
function closeDialog(){if(!isUnlocked())lock();dialog.close();resetDialog();}
function showUnlock(){if(isUnlocked())return;resetDialog();if(!dialog.open)dialog.showModal();passwordInput.focus();}
subscribe(()=>{const on=isUnlocked();$('#privacy-toggle').setAttribute('aria-checked',String(on));$('#privacy-toggle').classList.toggle('unlocked',on);$('.toggle-text').textContent=on?'비공개 표시 중':'비공개 정보';});
$('#privacy-toggle').addEventListener('click',()=>{if(isUnlocked()){lock();toast('비공개 정보를 다시 잠갔어요.');}else showUnlock();});
$('#dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
document.addEventListener('request-unlock',showUnlock);
$('#unlock-form').addEventListener('submit',async event=>{
 event.preventDefault();const operation=++uiGeneration;let password=passwordInput.value;passwordInput.value='';passwordInput.disabled=true;submit.disabled=true;submit.textContent='확인하는 중…';$('#unlock-error').textContent='';
 try{if(!crypto?.subtle)throw new Error('Secure context required');const pending=unlock(password,requiredIds);password=null;const ok=await pending;if(operation!==uiGeneration)return;if(ok){dialog.close();resetDialog();toast('비공개 정보를 표시했어요.');}}
 catch{if(operation===uiGeneration){$('#unlock-error').textContent='비밀번호가 맞지 않거나 정보를 열 수 없어요. HTTPS 연결과 비밀번호를 확인해 주세요.';}}
 finally{password=null;if(operation===uiGeneration){passwordInput.disabled=false;submit.disabled=false;submit.innerHTML='표시하기 <span>↗</span>';passwordInput.focus();}}
});
window.addEventListener('pagehide',()=>{lock();dialog.close();resetDialog();});
window.addEventListener('pageshow',event=>{if(event.persisted){lock();dialog.close();resetDialog();}});
$('.skip-link').addEventListener('click',event=>{event.preventDefault();$('#main').focus();$('#main').scrollIntoView({block:'start'});});
window.addEventListener('hashchange',()=>{if(dialog.open)closeDialog();route();});
route();
