(() => {
const catalog = {
  sentence: {
    category: "writing", level: "lvl-1", title: "Build a sentence", short: "어순 조립",
    description: "한국어식 단어 나열에서 벗어나 영어의 정보 순서를 손으로 조립합니다.",
    sessions: [
      { title: "말을 부드럽게 꺼내기", ko: "나는 그 제안이 실제로 꽤 괜찮다고 생각해.", tokens: ["actually", "I", "the proposal", "think", "is", "pretty good"], answer: "I actually think the proposal is pretty good.", note: "주어와 생각 동사(I think)를 먼저 세우고, actually는 생각을 부드럽게 보정합니다.", words: ["proposal", "actually"] },
      { title: "사람에게 행동을 부탁하기", ko: "퇴근하기 전에 나에게 초안을 보내줄 수 있어?", tokens: ["before", "send", "Could you", "the draft", "you leave", "me"], answer: "Could you send me the draft before you leave?", note: "send + 사람 + 사물의 4형식 패턴입니다. before 뒤에는 주어와 동사가 옵니다.", words: ["draft"] },
      { title: "결과가 된 상태 말하기", ko: "비 때문에 기차가 두 시간 늦게 도착했다.", tokens: ["two hours late", "The rain", "made", "the train", "arrive"], answer: "The rain made the train arrive two hours late.", note: "make + 목적어 + 동사원형: 어떤 원인이 목적어로 하여금 행동하게 만든 구조입니다.", words: ["arrive"] }
    ]
  },
  longform: {
    category: "writing", level: "lvl-1", title: "Long-form writing", short: "장문 작성",
    description: "에세이·이메일·의견문을 쓰고 채점 프롬프트와 답안을 함께 복사합니다.",
    sessions: [
      { title: "친절하지만 분명한 이메일", kind: "Email", prompt: "You ordered a desk lamp online, but the item arrived with a cracked base. Write an email to customer support. Explain the problem, mention what you have already tried, and ask for a specific solution.", goal: "90–140 words · clear request · polite tone", rubric: "task completion, clarity, natural tone, grammar, and useful email phrases", words: ["cracked", "replacement", "refund"] },
      { title: "일상 습관에 관한 의견", kind: "Opinion", prompt: "Some people plan every hour of their day, while others prefer to keep their schedule flexible. Which approach works better for you? Explain with one concrete example.", goal: "130–190 words · position · reason · example", rubric: "organization, development, natural collocations, grammar, and sentence variety", words: ["flexible", "schedule", "approach"] },
      { title: "짧은 문제 해결 에세이", kind: "Essay", prompt: "Your neighborhood library is used by fewer young adults than before. Suggest two realistic changes that could make the library more useful to them, and explain why they would work.", goal: "180–240 words · two proposals · expected effects", rubric: "focus, paragraphing, specificity, cohesion, vocabulary, and grammar", words: ["neighborhood", "accessible", "workshop"] }
    ]
  },
  cloze: {
    category: "reading", level: "lvl-1", title: "Fill the gap", short: "빈칸 채우기",
    description: "문법보다 문맥과 자연스러운 결합을 기준으로 빈칸을 채웁니다.",
    sessions: [
      { title: "비가 온 뒤의 계획", text: ["We were going to eat outside, ", " the sky suddenly turned dark. We moved everything indoors ", " it started raining."], blanks: [{options:["but","so","unless"],answer:"but"},{options:["before","although","during"],answer:"before"}], explain:"but은 반전을, before는 두 사건의 시간 순서를 연결합니다.", words:["suddenly","indoors"] },
      { title: "새 도구에 익숙해지는 시간", text: ["The new software felt awkward ", ". After a few days, however, I ", " the hang of it and finished my work faster."], blanks: [{options:["at first","at least","in fact"],answer:"at first"},{options:["got","made","took"],answer:"got"}], explain:"at first는 이후의 변화와 대비되고, get the hang of는 ‘요령을 익히다’라는 덩어리 표현입니다.", words:["awkward","hang"] },
      { title: "부탁을 거절하는 방식", text: ["Mina wanted to help, but she already had too much ", " her plate. She turned the request ", " without sounding cold."], blanks: [{options:["on","in","over"],answer:"on"},{options:["down","off","away"],answer:"down"}], explain:"have a lot on one's plate와 turn a request down은 원어민이 자주 쓰는 결합입니다.", words:["request","plate"] }
    ]
  },
  comprehension: {
    category: "reading", level: "lvl-1", title: "Read for meaning", short: "장문 이해",
    description: "세부 단어보다 글의 목적, 태도, 추론을 확인합니다.",
    sessions: [
      { title: "The quiet value of repair cafés", passage: "In many cities, volunteers gather at repair cafés to help neighbors fix lamps, jackets, and small appliances. The immediate benefit is obvious: fewer useful objects are thrown away. Yet the cafés also preserve a kind of practical knowledge that is easily lost when products are cheap to replace. Visitors do not simply leave with a working toaster. They watch, ask questions, and may feel confident enough to attempt a repair next time. The movement will not eliminate electronic waste by itself, but it changes the moment when people decide whether an object has reached the end of its life.", questions:[{q:"What is the writer's main point?",options:["Repair cafés reduce waste and pass practical confidence to visitors.","Cheap appliances are always impossible to repair.","Volunteers should be paid by electronics companies."],answer:0},{q:"What does “the moment” in the final sentence refer to?",options:["The decision to discard or keep an object","The opening time of a café","The purchase of a new toaster"],answer:0}], words:["preserve","discard","attempt"] },
      { title: "Why familiar routes feel shorter", passage: "A trip often seems longer the first time we take it than when we repeat it later. On an unfamiliar route, we monitor each turn and search for signs that we are going the right way. This creates many separate memories of the journey. Once the route becomes familiar, those decisions require less attention, so the trip is stored as a simpler event. The distance has not changed, but our experience of it has. This may also explain why a routine commute can feel surprisingly brief unless something interrupts it.", questions:[{q:"Why can a new route feel longer?",options:["It creates many attention-demanding moments.","New roads are physically longer.","People drive more slowly on every new road."],answer:0},{q:"Which event would most likely make a familiar commute feel longer?",options:["An unexpected road closure","Listening to the same playlist","Leaving at the usual time"],answer:0}], words:["route","monitor","interrupt"] },
      { title: "A useful kind of boredom", passage: "Boredom is usually treated as a problem to remove immediately. A spare minute is filled with a notification, a video, or a quick game. But mild boredom can signal that our attention is no longer satisfied with the current activity. If we resist the first impulse to distract ourselves, the mind may begin to search more widely for something meaningful to do. This does not mean that boredom is always productive. Long periods of it can be exhausting. The useful version is brief and unplanned: an empty space in which a different idea has room to appear.", questions:[{q:"What distinction does the writer make?",options:["Brief boredom may invite ideas, while prolonged boredom can drain us.","All entertainment prevents meaningful thought.","Notifications are more tiring than work."],answer:0},{q:"The writer would most likely recommend…",options:["occasionally leaving short idle moments unfilled","planning several hours of boredom each day","deleting every game from your phone"],answer:0}], words:["mild","impulse","prolonged"] }
    ]
  },
  dictation: {
    category: "listening", level: "lvl-1", title: "Dictation", short: "받아쓰기",
    description: "짧은 생활 문장을 듣고 직접 적은 뒤 원문과 비교합니다.",
    sessions: [
      { title: "계획 변경", text: "I was going to cook tonight, but I ended up ordering takeout.", tip: "was going to와 ended up의 약한 소리에 주목하세요.", words:["takeout"] },
      { title: "일정 확인", text: "Do you mind if we push the meeting back by half an hour?", tip: "push back은 일정을 뒤로 미루다라는 뜻입니다.", words:["meeting"] },
      { title: "물건을 찾는 상황", text: "I could have sworn I left my keys right here on the counter.", tip: "could have sworn은 강한 확신이 빗나갔을 때 자주 씁니다.", words:["counter","swear"] }
    ]
  },
  interpretation: {
    category: "listening", level: "lvl-1", title: "Meaning cards", short: "문장 해석 카드",
    description: "채점 없이 먼저 뜻을 떠올리고 자연스러운 해석과 뉘앙스를 확인합니다.",
    sessions: [
      { title: "부드러운 반대", text: "I see where you're coming from, but I'm not sure that would work in practice.", translation:"무슨 뜻으로 말하는지는 알겠지만, 그게 실제로 잘 될지는 모르겠어요.", nuance:"I see where you're coming from은 동의한다기보다 상대의 관점을 이해한다는 완충 표현입니다.", words:["practice"] },
      { title: "아슬아슬하게 해내기", text: "We were cutting it close, but we made it just before the doors closed.", translation:"시간이 정말 아슬아슬했지만 문이 닫히기 직전에 도착했어요.", nuance:"cut it close는 시간·거리의 여유가 거의 없다는 뜻이고, make it은 ‘해내다/제때 도착하다’입니다.", words:["close"] },
      { title: "일단 보류하기", text: "Let's sleep on it and see how we feel in the morning.", translation:"하룻밤 생각해 보고 아침에 마음이 어떤지 봅시다.", nuance:"sleep on something은 결정을 서두르지 않고 하룻밤 숙고한다는 캐주얼한 표현입니다.", words:["sleep"] }
    ]
  },
  basics: {
    category: "basics", level: "lvl-1", title: "Everyday verbs", short: "기초 동사 감각",
    description: "쉬운 동사의 전치사·문형·자동사 용법을 예문 덩어리로 익힙니다.",
    sessions: [
      { title: "GET — 변화와 도착", intro:"get은 ‘얻다’보다 상태 변화와 도착을 말할 때 훨씬 자주 만납니다.", usages:[{form:"get + adjective",meaning:"~한 상태가 되다",example:"It gets quiet after ten."},{form:"get to + place",meaning:"~에 도착하다",example:"What time did you get to work?"},{form:"get + object + to-infinitive",meaning:"누군가가 ~하게 만들다/설득하다 (5형식)",example:"I got him to check the numbers again."},{form:"get over + noun",meaning:"질병·충격 등을 극복하다",example:"It took her a while to get over the cold."}], words:["quiet","check","over"] },
      { title: "MAKE — 만들어 낸 결과", intro:"make는 물건뿐 아니라 결정, 시간, 변화, 결과를 만들어 냅니다.", usages:[{form:"make + noun",meaning:"결정·실수·계획 등을 하다",example:"We need to make a decision today."},{form:"make + object + adjective",meaning:"목적어를 어떤 상태로 만들다 (5형식)",example:"The news made everyone nervous."},{form:"make it",meaning:"해내다 / 참석하다 / 제시간에 도착하다",example:"I can't make it to dinner tonight."},{form:"make up for + noun",meaning:"부족함·잘못을 만회하다",example:"I'll work late to make up for lost time."}], words:["decision","nervous","lost"] },
      { title: "HAVE — 소유보다 경험", intro:"have는 소유뿐 아니라 경험, 식사, 대화, 의무를 자연스럽게 묶습니다.", usages:[{form:"have + experience noun",meaning:"경험하다",example:"We had a great time at the market."},{form:"have + object + past participle",meaning:"무언가가 되도록 맡기다/당하다",example:"I had my bike repaired yesterday."},{form:"have to + verb",meaning:"~해야 한다",example:"I have to head out in five minutes."},{form:"have someone over",meaning:"누군가를 집에 초대하다",example:"We're having a few friends over."}], words:["repair","head","over"] }
    ]
  }
};

const categoryNames = { home:"오늘의 연습", writing:"Writing", reading:"Reading", listening:"Listening", basics:"기초 단어", vocabulary:"내 단어장", settings:"데이터 관리", practice:"Practice" };
const categoryDescriptions = {
  writing:["sentence","longform"], reading:["cloze","comprehension"], listening:["dictation","interpretation"], basics:["basics"]
};
const researchSources = [
  { label:"Cambridge Grammar — Get", url:"https://dictionary.cambridge.org/grammar/british-grammar/get" },
  { label:"Cambridge Grammar — Make", url:"https://dictionary.cambridge.org/grammar/british-grammar/make" },
  { label:"Cambridge Grammar — Have something done", url:"https://dictionary.cambridge.org/grammar/british-grammar/have-something-done" },
  { label:"Cambridge Dictionary — Have", url:"https://dictionary.cambridge.org/dictionary/english/have" }
];
const wordInfo = {
  proposal:["a formal suggestion or plan","a business proposal"], actually:["used to emphasize the truth of a situation","It was actually fun."], draft:["a first version of a piece of writing","send the first draft"], arrive:["to reach a place","arrive at the station"], cracked:["damaged with a line on the surface","a cracked screen"], replacement:["a thing that takes the place of another","ask for a replacement"], refund:["money returned after a purchase","get a full refund"], flexible:["able to change easily","a flexible schedule"], schedule:["a plan of activities and times","a busy schedule"], approach:["a way of dealing with something","try a different approach"], neighborhood:["the area near where you live","a quiet neighborhood"], accessible:["easy to reach, use, or understand","accessible by bus"], workshop:["a practical meeting or class","a writing workshop"], suddenly:["quickly and unexpectedly","It suddenly started raining."], indoors:["inside a building","stay indoors"], awkward:["uncomfortable or not easy to use","an awkward silence"], hang:["the way something works; used in ‘get the hang of’","get the hang of it"], request:["an act of asking for something","turn down a request"], plate:["a flat dish; in ‘on your plate,’ responsibilities","I have a lot on my plate."], preserve:["to keep something in its original state","preserve local knowledge"], discard:["to throw something away","discard the packaging"], attempt:["to try to do something","attempt a repair"], route:["a way from one place to another","take a different route"], monitor:["to watch and check over time","monitor progress"], interrupt:["to stop something briefly","Sorry to interrupt."], mild:["not strong or severe","mild weather"], impulse:["a sudden strong wish to act","resist the impulse"], prolonged:["continuing for a long time","prolonged stress"], takeout:["food bought from a restaurant to eat elsewhere","order takeout"], meeting:["an occasion when people gather to discuss","push the meeting back"], counter:["a long flat surface in a kitchen or store","on the kitchen counter"], swear:["to state very strongly that something is true","I could have sworn..."], practice:["actual use or action, rather than theory","It works in practice."], close:["with very little time or distance to spare","cut it close"], sleep:["to rest with your eyes closed; in ‘sleep on it,’ delay a decision","Let's sleep on it."], quiet:["making little or no noise","get quiet"], check:["to examine something for accuracy","check the numbers"], over:["finished; across; used in many phrasal verbs","get over a cold"], decision:["a choice made after thinking","make a decision"], nervous:["worried or slightly afraid","feel nervous"], lost:["unable to be found; no longer available","make up for lost time"], repair:["to fix something damaged","have a bike repaired"], head:["to go in a particular direction","head out"], default:["a saved word from a lesson","review this word in context"]
};

window.HINGE_CONTENT = Object.freeze({
  catalog,
  categoryNames,
  categoryDescriptions,
  researchSources,
  wordInfo
});
})();
