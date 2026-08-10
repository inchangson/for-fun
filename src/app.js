const { catalog, categoryNames, categoryDescriptions, researchSources, wordInfo } = window.HINGE_CONTENT;

const STORAGE_KEY = "hingeEnglishState.v1";

const freshState = () => ({ version:1, progress:{}, drafts:{}, answers:{}, words:{}, recent:null });
function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed && parsed.version === 1 ? { ...freshState(), ...parsed } : freshState();
  } catch { return freshState(); }
}
let state = loadState();
let currentActivity = null;
let currentSession = 0;
let sentenceChosen = [];
let toastTimer;

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const progressKey = id => `${catalog[id].level}-${id}`;
const answerKey = (id, session) => `${progressKey(id)}-${session}`;
const getProgress = id => state.progress[progressKey(id)] || { current:0, completed:[] };

function save(message="저장했습니다") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  $("#saveStatus").textContent = "방금 이 기기에 저장됨";
  clearTimeout(save._timer);
  save._timer = setTimeout(() => $("#saveStatus").textContent = "이 기기에 자동 저장됨", 1600);
  if (message) toast(message);
  renderCounts();
}
function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2100);
}
function esc(value) { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function normalize(value) { return value.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim(); }
function wordButton(word) { return `<button class="word-click" data-word="${esc(word.toLowerCase())}" title="단어장에 저장">${esc(word)}</button>`; }
function markWords(text, words=[]) {
  if (!words.length) return esc(text);
  const pattern = new RegExp(`\\b(${words.map(w => w.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")).join("|")})\\b`, "gi");
  let cursor=0, html=""; for (const match of text.matchAll(pattern)) { html += esc(text.slice(cursor, match.index)) + wordButton(match[0]); cursor = match.index + match[0].length; } return html + esc(text.slice(cursor));
}

function navigate(view) {
  $$(".view").forEach(el => el.classList.toggle("active", el.id === `view-${view}`));
  $$(".nav button").forEach(el => el.classList.toggle("active", el.dataset.view === view || (view === "practice" && el.dataset.view === catalog[currentActivity]?.category)));
  $("#topTitle").textContent = view === "practice" && currentActivity ? catalog[currentActivity].title : categoryNames[view];
  $("#sidebar").classList.remove("open"); window.scrollTo({top:0, behavior:"smooth"});
  if (view === "home") renderHome();
  if (["writing","reading","listening","basics"].includes(view)) renderCategory(view);
  if (view === "vocabulary") renderVocab();
  if (view === "settings") renderSettings();
}

function completedFor(ids) { return ids.reduce((sum,id) => sum + getProgress(id).completed.length, 0); }
function renderCounts() {
  const words = Object.keys(state.words).length;
  const done = Object.keys(catalog).reduce((sum,id) => sum + getProgress(id).completed.length, 0);
  $("#topWordCount").textContent = words; $("#sideWordCount").textContent = words; $("#heroWords").textContent = words;
  $("#heroDone").textContent = `${done} / 21`;
  $("#heroContinue").textContent = state.recent ? catalog[state.recent]?.short || "학습 중" : "처음";
  $("#settingsWordCount").textContent = `저장된 단어 ${words}개`;
}

function renderHome() {
  const tracks = [
    {name:"Writing", view:"writing", ids:categoryDescriptions.writing, desc:"문장 조립과 장문 작성"},
    {name:"Reading", view:"reading", ids:categoryDescriptions.reading, desc:"빈칸과 장문 이해"},
    {name:"Listening", view:"listening", ids:categoryDescriptions.listening, desc:"받아쓰기와 해석 카드"}
  ];
  $("#homeTracks").innerHTML = tracks.map((t,i) => { const done=completedFor(t.ids), total=t.ids.length*3; return `<article class="track"><span class="track-num">0${i+1}</span><h3>${t.name}</h3><p>${t.desc} · ${done}/${total}회 완료</p><button class="btn secondary" data-go="${t.view}">연습 열기 →</button><div class="progress-line"><i style="width:${done/total*100}%"></i></div></article>`; }).join("");
  renderCounts();
}

function renderCategory(category) {
  const container = $(`#${category}Activities`);
  container.innerHTML = categoryDescriptions[category].map(id => { const item=catalog[id], p=getProgress(id); return `<article class="activity-card"><span class="pill ${id === "longform" || id === "dictation" ? "orange":""}">${item.level.toUpperCase()} · 3 SESSIONS</span><h3>${item.title}</h3><p>${item.description}</p><footer><span style="font-size:.77rem;color:var(--muted)">${p.completed.length}/3 완료 · ${p.current+1}회차</span><button class="btn" data-activity="${id}">${p.completed.length ? "계속하기":"시작하기"}</button></footer><div class="progress-line"><i style="width:${p.completed.length/3*100}%"></i></div></article>`; }).join("");
}

function openActivity(id, session=getProgress(id).current || 0) {
  currentActivity=id; currentSession=Math.max(0,Math.min(2,session)); sentenceChosen=[];
  const item=catalog[id]; const p=getProgress(id); p.current=currentSession; state.progress[progressKey(id)]=p; state.recent=id; save("");
  $("#practiceKicker").textContent = `${item.level.toUpperCase()} · ${item.category.toUpperCase()} · SESSION ${currentSession+1}`;
  $("#practiceTitle").textContent = item.sessions[currentSession].title;
  $("#practiceSubtitle").textContent = item.description;
  $("#backToCategory").dataset.back = item.category;
  renderSessionNav(); renderPractice(); navigate("practice");
}
function renderSessionNav() {
  const p=getProgress(currentActivity);
  $("#sessionNav").innerHTML = [0,1,2].map(i => `<button data-session="${i}" class="${i===currentSession?"active":""} ${p.completed.includes(i)?"done":""}">${i+1}</button>`).join("");
  const done=p.completed.includes(currentSession); $("#completeButton").textContent=done?"완료 취소":"완료로 표시";
  $("#progressNote").textContent=done?"이 회차를 완료했습니다. 다시 풀어도 기록은 유지됩니다.":"답안과 현재 회차가 자동 저장됩니다.";
}
function renderPractice() {
  const item=catalog[currentActivity], s=item.sessions[currentSession], root=$("#practiceContent");
  const renderers={sentence:renderSentence,longform:renderLongform,cloze:renderCloze,comprehension:renderComprehension,dictation:renderDictation,interpretation:renderInterpretation,basics:renderBasics};
  root.innerHTML=renderers[currentActivity](s);
  wirePracticeControls();
}
function header(s, instruction) { return `<span class="pill">SESSION ${currentSession+1} OF 3</span><h3>${esc(s.title)}</h3><p class="lead">${instruction}</p>`; }

function renderSentence(s) {
  const saved=state.answers[answerKey(currentActivity,currentSession)]; if (saved?.tokens) sentenceChosen=saved.tokens;
  const remaining=s.tokens.filter((_,index) => !sentenceChosen.includes(index));
  return `${header(s,"단어 조각을 눌러 자연스러운 영어 문장을 만드세요.")}<div class="instruction">${esc(s.ko)}</div><label class="field">내 문장</label><div class="answer-line" id="answerLine">${sentenceChosen.map(i=>`<button class="token" data-chosen="${i}">${esc(s.tokens[i])}</button>`).join("")}</div><label class="field">남은 조각</label><div class="token-bank" id="tokenBank">${remaining.map(token=>{const i=s.tokens.indexOf(token); return `<button class="token" data-token="${i}">${esc(token)}</button>`}).join("")}</div><div class="action-row"><button class="btn" id="checkSentence">문장 확인</button><button class="btn secondary" id="clearSentence">다시 놓기</button></div><div class="feedback" id="sentenceFeedback"></div><div class="prompt-box" id="sentenceAnswer" hidden><b>모범 문장</b><p>${markWords(s.answer,s.words)}</p><small>${esc(s.note)}</small></div>`;
}
function renderLongform(s) {
  const saved=state.drafts[answerKey(currentActivity,currentSession)] || "";
  return `${header(s,"충분히 생각한 뒤 영어로 작성하세요. 초안은 이 브라우저에 자동 저장됩니다.")}<div class="prompt-box"><span class="pill orange">${esc(s.kind)}</span><p style="margin-top:10px">${markWords(s.prompt,s.words)}</p><small>${esc(s.goal)}</small></div><label class="field" for="longDraft">내 답안</label><textarea id="longDraft" placeholder="Write your response here...">${esc(saved)}</textarea><div class="field-meta"><span id="wordCount">0 words</span><span>저장 범위: ${progressKey(currentActivity)} · ${currentSession+1}회차</span></div><div class="action-row"><button class="btn orange" id="copyWriting">채점 프롬프트 + 답안 복사</button><button class="btn secondary" id="clearDraft">초안 비우기</button></div>`;
}
function renderCloze(s) {
  const saved=state.answers[answerKey(currentActivity,currentSession)] || {};
  let text=""; s.text.forEach((part,i)=>{text+=markWords(part,s.words); if(s.blanks[i]) text+=`<select class="cloze-select" data-blank="${i}" aria-label="${i+1}번 빈칸"><option value="">선택</option>${s.blanks[i].options.map(o=>`<option ${saved[i]===o?"selected":""}>${esc(o)}</option>`).join("")}</select>`;});
  return `${header(s,"문장 전체의 흐름과 단어 결합을 보고 가장 자연스러운 표현을 고르세요.")}<div class="prompt-box cloze-text">${text}</div><div class="action-row"><button class="btn" id="checkCloze">정답 확인</button></div><div class="feedback" id="clozeFeedback"></div><div class="prompt-box" id="clozeExplain" hidden><b>포인트</b><p>${esc(s.explain)}</p></div>`;
}
function renderComprehension(s) {
  const saved=state.answers[answerKey(currentActivity,currentSession)] || {};
  return `${header(s,"먼저 글 전체를 읽고, 지문에 근거해 질문에 답하세요.")}<div class="reading-passage">${markWords(s.passage,s.words)}</div>${s.questions.map((q,qi)=>`<div class="question"><p>${qi+1}. ${esc(q.q)}</p>${q.options.map((o,oi)=>`<button class="option ${saved[qi]===oi?"selected":""}" data-question="${qi}" data-option="${oi}">${esc(o)}</button>`).join("")}</div>`).join("")}<div class="action-row"><button class="btn" id="checkReading">정답 확인</button></div><div class="feedback" id="readingFeedback"></div>`;
}
function renderDictation(s) {
  const saved=state.answers[answerKey(currentActivity,currentSession)]?.text || "";
  return `${header(s,"재생 속도를 바꿔가며 듣고, 들린 문장을 그대로 적어 보세요.")}<div class="audio-box"><button class="play" id="playAudio" aria-label="문장 재생">▶</button><p>브라우저 음성으로 재생 · <select id="speechRate"><option value="0.75">0.75×</option><option value="0.9" selected>0.9×</option><option value="1">1×</option></select></p></div><label class="field" for="dictationText">받아쓰기</label><textarea class="dictation-input" id="dictationText" placeholder="Type what you hear...">${esc(saved)}</textarea><div class="action-row"><button class="btn" id="checkDictation">원문 비교</button><button class="btn secondary" id="replayAudio">다시 듣기</button></div><div class="transcript" id="transcript" hidden><b>원문</b><p>${markWords(s.text,s.words)}</p><small>${esc(s.tip)}</small></div>`;
}
function renderInterpretation(s) {
  return `${header(s,"문장을 소리 내어 읽고 뜻을 떠올린 뒤 카드를 뒤집으세요. 별도 채점은 없습니다.")}<div class="interpret-card"><div><blockquote>${markWords(s.text,s.words)}</blockquote><div class="hint">단어보다 말하는 사람의 의도를 먼저 떠올려 보세요.</div></div></div><div class="action-row"><button class="btn orange" id="revealMeaning">해석 보기</button></div><div class="reveal" id="meaningReveal" hidden><h4>자연스러운 해석</h4><p>${esc(s.translation)}</p><p><b>뉘앙스:</b> ${esc(s.nuance)}</p></div>`;
}
function renderBasics(s) {
  return `${header(s,"뜻 하나를 외우기보다 문형과 전치사를 포함한 덩어리로 읽어 보세요.")}<div class="instruction">${esc(s.intro)}</div><div class="word-lesson" style="margin-top:17px">${s.usages.map(u=>`<article class="usage-card"><h4>${esc(u.form)}</h4><p class="meaning">${esc(u.meaning)}</p><p>${markWords(u.example,s.words)}</p><div class="grammar-note">PATTERN · ${esc(u.form.includes("object")?"목적어 구조":"자주 쓰는 결합")}</div></article>`).join("")}</div><div class="prompt-box"><b>용례 검토 출처</b><small>${researchSources.map(source=>`<a href="${source.url}" target="_blank" rel="noreferrer">${esc(source.label)}</a>`).join(" · ")}</small></div><div class="action-row"><button class="btn" id="finishBasics">읽었어요 · 완료 표시</button></div>`;
}

function wirePracticeControls() {
  $$("[data-word]", $("#practiceContent")).forEach(b=>b.addEventListener("click",()=>addWord(b.dataset.word)));
  if(currentActivity==="sentence") wireSentence();
  if(currentActivity==="longform") wireLongform();
  if(currentActivity==="cloze") wireCloze();
  if(currentActivity==="comprehension") wireReading();
  if(currentActivity==="dictation") wireDictation();
  if(currentActivity==="interpretation") $("#revealMeaning").onclick=()=>{ $("#meaningReveal").hidden=false; markComplete(true); };
  if(currentActivity==="basics") $("#finishBasics").onclick=()=>markComplete(true);
}
function storeAnswer(value) { state.answers[answerKey(currentActivity,currentSession)]=value; save(""); }
function wireSentence() {
  const persist=()=>{storeAnswer({tokens:sentenceChosen}); renderPractice();};
  $$("[data-token]").forEach(b=>b.onclick=()=>{sentenceChosen.push(Number(b.dataset.token));persist();});
  $$("[data-chosen]").forEach(b=>b.onclick=()=>{sentenceChosen=sentenceChosen.filter(i=>i!==Number(b.dataset.chosen));persist();});
  $("#clearSentence").onclick=()=>{sentenceChosen=[];persist();};
  $("#checkSentence").onclick=()=>{const s=catalog.sentence.sessions[currentSession], made=sentenceChosen.map(i=>s.tokens[i]).join(" ")+"."; const ok=normalize(made)===normalize(s.answer); const f=$("#sentenceFeedback"); f.textContent=ok?"좋아요. 영어의 자연스러운 정보 순서입니다.":"조금 달라요. 모범 문장과 설명을 비교해 보세요.";f.className=`feedback ${ok?"good":"bad"}`;$("#sentenceAnswer").hidden=false;if(ok)markComplete(true);};
}
function updateWordCount() { const value=$("#longDraft").value.trim(); $("#wordCount").textContent=`${value?value.split(/\s+/).length:0} words`; }
function wireLongform() {
  const area=$("#longDraft"); updateWordCount(); let timer;
  area.oninput=()=>{updateWordCount();clearTimeout(timer);timer=setTimeout(()=>{state.drafts[answerKey(currentActivity,currentSession)]=area.value;save("");},300);};
  $("#clearDraft").onclick=()=>{if(!area.value||confirm("이 회차의 초안을 비울까요?")){area.value="";state.drafts[answerKey(currentActivity,currentSession)]="";save("초안을 비웠습니다");updateWordCount();}};
  $("#copyWriting").onclick=async()=>{const s=catalog.longform.sessions[currentSession], answer=area.value.trim();if(!answer){toast("먼저 답안을 작성해 주세요");return;}state.drafts[answerKey(currentActivity,currentSession)]=answer;save("");const prompt=`You are a supportive English writing coach for a Korean learner.\n\nTASK\n${s.prompt}\n\nLEARNER'S ANSWER\n${answer}\n\nFEEDBACK INSTRUCTIONS\n1. Evaluate: ${s.rubric}.\n2. Explain the 3 most important improvements in Korean.\n3. Quote only short phrases from my answer when pointing out issues.\n4. Provide a corrected version that preserves my meaning and level.\n5. Extract 5 reusable English expressions with one new example each.\n6. End with one focused assignment for rewriting.\nDo not invent errors. Clearly distinguish required corrections from optional stylistic improvements.`;if(await copyText(prompt)){toast("채점 프롬프트와 답안을 복사했습니다");markComplete(true);}};
}
function wireCloze() {
  $$(".cloze-select").forEach(sel=>sel.onchange=()=>{const saved=state.answers[answerKey(currentActivity,currentSession)]||{};saved[sel.dataset.blank]=sel.value;storeAnswer(saved);});
  $("#checkCloze").onclick=()=>{const s=catalog.cloze.sessions[currentSession];const chosen=$$(".cloze-select").map(x=>x.value);const score=chosen.filter((v,i)=>v===s.blanks[i].answer).length;const f=$("#clozeFeedback");f.textContent=`${s.blanks.length}개 중 ${score}개 정답 · 정답: ${s.blanks.map(b=>b.answer).join(" / ")}`;f.className=`feedback ${score===s.blanks.length?"good":"bad"}`;$("#clozeExplain").hidden=false;if(score===s.blanks.length)markComplete(true);};
}
function wireReading() {
  $$(".option").forEach(b=>b.onclick=()=>{const saved=state.answers[answerKey(currentActivity,currentSession)]||{};saved[b.dataset.question]=Number(b.dataset.option);storeAnswer(saved);renderPractice();});
  $("#checkReading").onclick=()=>{const s=catalog.comprehension.sessions[currentSession],saved=state.answers[answerKey(currentActivity,currentSession)]||{};let score=0;$$('.option').forEach(b=>{const q=Number(b.dataset.question),o=Number(b.dataset.option);if(o===s.questions[q].answer)b.classList.add('correct');if(saved[q]===o&&o!==s.questions[q].answer)b.classList.add('wrong');});s.questions.forEach((q,i)=>{if(saved[i]===q.answer)score++;});const f=$("#readingFeedback");f.textContent=`${s.questions.length}문제 중 ${score}문제 정답입니다.`;f.className=`feedback ${score===s.questions.length?"good":"bad"}`;if(score===s.questions.length)markComplete(true);};
}
function speak() { const s=catalog.dictation.sessions[currentSession];if(!('speechSynthesis' in window)){toast("이 브라우저에서는 음성 재생을 지원하지 않습니다");return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(s.text);u.lang="en-US";u.rate=Number($("#speechRate").value);speechSynthesis.speak(u); }
function wireDictation() {
  $("#playAudio").onclick=speak;$("#replayAudio").onclick=speak;$("#dictationText").oninput=e=>storeAnswer({text:e.target.value});
  $("#checkDictation").onclick=()=>{$("#transcript").hidden=false;const s=catalog.dictation.sessions[currentSession];if(normalize($("#dictationText").value)===normalize(s.text)){toast("정확히 들었습니다");markComplete(true);}else toast("원문과 다른 부분을 소리 내어 비교해 보세요");};
}
function markComplete(forceState) {
  const p=getProgress(currentActivity), exists=p.completed.includes(currentSession), shouldComplete=forceState===undefined?!exists:forceState;
  p.completed=shouldComplete?[...new Set([...p.completed,currentSession])]:p.completed.filter(i=>i!==currentSession);p.current=currentSession;state.progress[progressKey(currentActivity)]=p;save(shouldComplete?"회차를 완료했습니다":"완료 표시를 취소했습니다");renderSessionNav();
}

function addWord(word) {
  const key=word.toLowerCase(), info=wordInfo[key]||wordInfo.default;state.words[key]={word:key,definition:info[0],example:info[1],source:catalog[currentActivity]?.title||"lesson",savedAt:new Date().toISOString()};save(`“${key}”을(를) 단어장에 저장했습니다`);navigate("vocabulary");
}
function renderVocab() {
  const words=Object.values(state.words).sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt));$("#vocabSummary").textContent=`${words.length} WORD${words.length===1?"":"S"}`;
  $("#vocabGrid").innerHTML=words.length?words.map(w=>`<article class="vocab-card"><header><h3>${esc(w.word)}</h3><button class="icon-btn" data-remove-word="${esc(w.word)}" aria-label="${esc(w.word)} 삭제">×</button></header><p><b>EN:</b> ${esc(w.definition)}</p><p><b>EX:</b> ${esc(w.example)}</p><span class="pill" style="margin-top:12px">${esc(w.source)}</span></article>`).join(""):`<div class="empty" style="grid-column:1/-1"><b>아직 저장한 단어가 없어요.</b><br>학습 화면에서 밑줄 친 영어 단어를 눌러 보세요.</div>`;
  $$('[data-remove-word]').forEach(b=>b.onclick=()=>{delete state.words[b.dataset.removeWord];save("단어를 삭제했습니다");renderVocab();});renderCounts();
}
async function copyVocabPrompt() {
  const words=Object.values(state.words);if(!words.length){toast("먼저 단어를 저장해 주세요");return;}
  const list=words.map((w,i)=>`${i+1}. ${w.word} — ${w.definition} — Saved example: ${w.example}`).join("\n");
  const prompt=`You are an English vocabulary tutor for a Korean learner. Build a practical study sheet from my archived word list below.\n\nFor EACH word:\n1. Give a concise English-English dictionary definition.\n2. Give 3 natural examples in increasing difficulty: short/casual, everyday context, then longer or nuanced.\n3. If it is polysemous, separate the important meanings instead of mixing them.\n4. If it commonly combines with different prepositions or particles, list each pattern separately with meaning and example.\n5. Mention transitive/intransitive use or notable sentence patterns (such as SVOC/SVOO) when useful.\n6. Add one common learner mistake for a Korean speaker.\n7. Finish with a 10-question active-recall quiz.\nKeep explanations primarily in clear English; use brief Korean only where a distinction is hard to understand. Do not fabricate rare usages.\n\nARCHIVED WORDS\n${list}`;
  if(await copyText(prompt))toast("단어 학습 프롬프트와 목록을 복사했습니다");
}
async function copyText(text) { try { await navigator.clipboard.writeText(text); return true; } catch { const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();const ok=document.execCommand("copy");area.remove();return ok; } }
function clearVocab() { if(!Object.keys(state.words).length){toast("비울 단어가 없습니다");return;}if(confirm("저장한 단어를 모두 지울까요? 학습 진도는 유지됩니다.")){state.words={};save("저장 단어를 모두 비웠습니다");renderVocab();renderSettings();} }

function renderSettings() {
  $("#resetList").innerHTML=Object.entries(catalog).map(([id,item])=>{const p=getProgress(id);return `<div class="reset-row"><span>${item.level} · ${item.title}<br><small style="color:var(--muted)">${p.completed.length}/3 완료, ${p.current+1}회차까지</small></span><button class="btn danger" data-reset="${id}">초기화</button></div>`;}).join("");
  $$('[data-reset]').forEach(b=>b.onclick=()=>resetActivity(b.dataset.reset));renderCounts();
}
function resetActivity(id) {
  const item=catalog[id];if(!confirm(`${item.level} · ${item.title}의 완료 여부, 현재 회차, 답안을 지울까요?`))return;
  delete state.progress[progressKey(id)];Object.keys(state.answers).filter(k=>k.startsWith(progressKey(id))).forEach(k=>delete state.answers[k]);Object.keys(state.drafts).filter(k=>k.startsWith(progressKey(id))).forEach(k=>delete state.drafts[k]);if(state.recent===id)state.recent=null;save(`${item.title} 진도를 초기화했습니다`);renderSettings();
}

$$(".nav button").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
document.addEventListener("click",e=>{const go=e.target.closest("[data-go]");if(go)navigate(go.dataset.go);const activity=e.target.closest("[data-activity]");if(activity)openActivity(activity.dataset.activity);});
$("#menuButton").onclick=()=>$("#sidebar").classList.toggle("open");
$("#backToCategory").onclick=e=>navigate(e.currentTarget.dataset.back);
$("#sessionNav").addEventListener("click",e=>{const b=e.target.closest("[data-session]");if(b)openActivity(currentActivity,Number(b.dataset.session));});
$("#completeButton").onclick=()=>markComplete();
$("#copyVocab").onclick=copyVocabPrompt;$("#clearVocab").onclick=clearVocab;$("#settingsClearVocab").onclick=clearVocab;
renderHome();renderCounts();
