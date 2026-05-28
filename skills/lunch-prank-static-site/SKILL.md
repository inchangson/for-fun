---
name: lunch-prank-static-site
description: Create flashy single-page static HTML joke sites about lunch menus, office restaurant debates, cafeteria rankings, food propaganda, playful rebuttals, or in-team food memes. Use this whenever the user wants a funny one-page site about 점심 메뉴, 식당, 메뉴 대전, 반박 페이지, 장난 사이트, 밈 랜딩페이지, or shareable internal joke pages for coworkers, even if they do not explicitly say "skill" or "HTML."
---

# Lunch Prank Static Site

Build a shareable one-page static site that turns a lunch/menu argument into a polished joke page.

Default to a **single `index.html`** with inline CSS and JavaScript unless the user asks for a multi-file setup.

## What this skill is for

Use this skill when the user wants things like:
- a fake campaign site for one lunch menu over another
- a rebuttal page mocking another menu or restaurant
- an office inside-joke landing page about food choices
- a flashy static page to share in chat or deploy quickly on Netlify
- a ranking page, propaganda page, verdict page, or menu battle page

This skill works best when the output should feel:
- theatrical
- meme-friendly
- easy to deploy
- visually loud
- short enough to skim and laugh at

## Core behavior

1. Figure out the bit.
   - Who is being defended?
   - Who is being roasted?
   - Is the tone mock-serious, absurdly official, tabloid, dramatic, or chaotic?

2. Commit to the world of the joke.
   - Write as if the page truly believes its position.
   - Avoid stepping outside the bit to explain that it is "funny," "for humor," "dynamic," or "technical."
   - Avoid self-conscious copy like:
     - "웃기면서도..."
     - "기술적으로..."
     - "이 페이지는..."
     - "장난으로 만든..."
     - "원문 링크를 걸어둔 페이지입니다"

3. Make the page deployable fast.
   - Prefer one self-contained HTML file.
   - Inline styles and scripts.
   - Keep external dependencies out unless the user explicitly wants them.

4. Make it feel alive.
   - Use a bold visual hook near the top: ticker, sticker, verdict stamp, split-screen, faux breaking news, or giant headline.
   - Add a few lightweight interactions: toggles, playful buttons, animated counters, floating emojis, hover states, or reveal animations.
   - Keep interactions decorative and readable. Do not let effects hide buttons or important text.

## Copy rules

Write copy that sounds like confident nonsense with a straight face.

Good patterns:
- mock verdicts
- fake official announcements
- overconfident side comments
- petty comparison tables
- one-line catchphrases people would screenshot

Avoid:
- explaining the site structure
- describing the technology used
- praising your own joke quality
- repeating the user's prompt in the page
- meta narration about "this section" or "this feature"

If there is a source page being rebutted, you may link it, but treat it naturally:
- "상대편 입장 보기"
- "저쪽 주장 확인"
- "원문 보러 가기"

Do not turn the link into process narration.

## Visual direction

Aim for **campy but stylish**.

Use combinations like:
- loud gradients + sticker labels
- fake news ticker + glossy cards
- oversize typography + playful rotation
- glassmorphism or poster-style blocks
- neon accents, dotted backgrounds, floating emoji, mock stamps

The result should feel intentionally extra, not generic corporate.

## Recommended page structure

Adapt as needed, but this structure usually works:

1. Top hook
   - breaking-news bar, ticker, or absurd alert

2. Hero
   - huge headline
   - short thesis
   - 1-3 CTA buttons

3. Main argument
   - 3-5 cards with accusations, rebuttals, or verdicts

4. Comparison section
   - funny table, ranking, or scorecard

5. Interactive bit
   - buttons, selector, reveal box, rotating verdict, etc.

6. Final ruling
   - one strong closing line

## Interaction rules

- Keep controls clearly visible on desktop and mobile.
- Prevent decorative layers from covering CTAs.
- Prefer short feedback text after button clicks.
- Effects should amplify the joke, not distract from the reading flow.

## Output expectations

When implementing:
- Create or update `index.html`
- Make the copy fully in-world
- Keep the site deploy-ready as static HTML
- If the user already has a page, preserve the strongest bits and rewrite only the weak/meta parts

## Example asks this skill should handle

**Example 1**
User: "회사에서 부대찌개 vs 쌀국수로 싸우는데 쌀국수 옹호용 장난 페이지 만들어줘"

Behavior:
- Build a one-page pro-pho propaganda site
- Use dramatic headings, petty comparison points, and a confident final ruling

**Example 2**
User: "저 Netlify 페이지 반박하는 사이트 만들어줘. 더 촌스럽고 더 힙했으면 좋겠어"

Behavior:
- Read the existing page
- Reframe the copy to stay inside the joke
- Add louder visuals without making the page unusable

**Example 3**
User: "사내 점심 식당 순위표를 밈 사이트처럼 만들어줘"

Behavior:
- Turn rankings into a fake award show or official league table
- Use strong labels and screenshot-friendly one-liners
