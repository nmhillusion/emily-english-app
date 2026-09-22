# Routing Design — Welcome / Start / Learn / Result (Approach B)

Date: 2026-09-22
Status: Approved Sections 1–2, awaiting spec review before implementation plan
Related request: splash screen first with Start button; routes `/welcome`, `/start`, `/learn`, `/result` with `/learn` child routes

## 1. Goal

Replace the single-shell `stage`-signal flow (0–6) with router-driven flow, keeping lesson state in signals:

- `/welcome` — splash / branding + Start button
- `/start` — topic choice (existing TopicPicker)
- `/learn/*` — in-learning progress (5 child routes)
- `/result` — ending screen (existing ResultView)

No lesson generation on splash. Start goes to topic choice (branding-then-topic, as clarified).

## 2. Route tree

```
/welcome                          → WelcomeComponent (NEW)
/start                            → TopicPickerComponent (existing, stage 0)
/learn                            → LearnShellComponent (NEW, <router-outlet>)
  /learn/vocab      → VocabIntroComponent      (was stage 1)
  /learn/words      → WordPracticeComponent    (was stage 2)
  /learn/story      → StoryViewComponent       (was stage 3)
  /learn/sentences  → SentencePracticeComponent (was stage 4)
  /learn/quiz       → QuizStepComponent        (was stage 5)
/learn → redirect /learn/vocab
/result                           → ResultViewComponent (was stage 6)
'' → redirect /welcome
'**' → redirect /welcome
```

## 3. Components

- `WelcomeComponent` (`src/app/features/welcome/welcome.component.ts`, standalone, selector `app-welcome`): branding card reusing `.card`, `.badge`, `.bigpic`, `.btn.big.go` from `src/styles.css`. Content: big 👩‍🏫, "Cô Emily", "Lớp tiếng Anh vui vẻ", button "Bắt đầu 🎒" → `router.navigate(['/start'])`. No inputs, no async.
- `LearnShellComponent` (`src/app/features/learn/learn-shell.component.ts`, standalone): thin `<router-outlet>` wrapper only.
- `App` (`src/app/app.ts`, `src/app/app.html`): becomes layout shell — topbar + rail + `<router-outlet>`. Removes 7 lesson-step imports, adds `RouterOutlet` + router-events subscription. Rail index derived from URL, not `store.stage()`: `/start`=0, `/learn/vocab`…`/learn/quiz`=1…5, `/result`=6; rail hidden on `/welcome`.

## 4. Data flow

- `/start` success (`LessonService.generate(topic)`): `store.topic.set(t)`, `store.lesson.set(lesson)`, reset `wordIdx/sentIdx/qIdx/answers`, then `navigate(['/learn/vocab'])` (replaces `store.go(1)`).
- Learn steps: each `next()` navigates to next child instead of `store.go(n)`:
  - vocab → `/learn/words`, words → `/learn/story`, story → `/learn/sentences`, sentences → `/learn/quiz`, quiz-last → `/result`.
- Result: `retry()` → reset answers/qIdx + `navigate(['/learn/quiz'])`; `newTopic()` → clear lesson/answers + `navigate(['/start'])`.
- `ProgressStore`: keep `topic/lesson/wordIdx/sentIdx/qIdx/answers` signals; `stage` becomes derived helper from URL or removed to avoid router+signal drift (decision at implementation).
- TTS: replace `effect(() => store.stage(); tts.stop())` in `app.ts` with router-events subscription stopping TTS on `NavigationEnd`.

## 5. Guards & error handling

- `lessonGuard` on `/learn/*` + `/result`: if `store.lesson() == null` → redirect `/start` (covers refresh/deep-link with no lesson).
- Optional `quizGuard` on `/result`: if answers incomplete → redirect `/learn/quiz`.
- Topic generation errors stay in TopicPicker (`no-key` / network messages, unchanged).
- PWA: verify `ngsw-config.json` `navigationUrls` allows SPA routes offline.

## 6. Styling / i18n

- Reuse existing kid palette; no new global CSS. Welcome-specific tweaks inline in component if needed.
- Vietnamese copy, matching existing tone ("Cô Emily", kid name via `SettingsService.kidOr()` where already used; splash itself needs no name).

## 7. Testing

- New: `welcome.component.spec.ts` (renders + Start navigates), `learn-shell.spec.ts`, route-config + guard specs.
- Update: `app.spec.ts` (shell asserts `router-outlet` + redirect, not `app-api-key-bar` directly), `progress.store.spec.ts` if `stage` removed/changed.
- Verify: `npm run build` (+ manual click-through welcome → start → vocab → words → story → sentences → quiz → result → new topic).

## 8. File impact

1. NEW `src/app/features/welcome/welcome.component.ts` (+ spec)
2. NEW `src/app/features/learn/learn-shell.component.ts` (+ spec)
3. EDIT `src/app/app.routes.ts` — full route tree + guards
4. EDIT `src/app/app.ts` — RouterOutlet, rail-from-URL, TTS on NavigationEnd
5. EDIT `src/app/app.html` — replace `@switch(stage)` with `<router-outlet>`
6. EDIT `src/app/core/services/progress.store.ts` — stage deprecation/derivation
7. EDIT 7 step components (`topic-picker`, `vocab-intro`, `word-practice`, `story-view`, `sentence-practice`, `quiz-step`, `result-view`) — `go()` → `navigate()` combos
8. EDIT `src/app/app.spec.ts` (+ store spec if needed)
9. CHECK `ngsw-config.json` — SPA navigation URLs

## 9. Self-review

- No TBD/TODO placeholders; requirements explicit.
- Consistent: single source of truth = router URL; stage signal deprecated to avoid drift.
- Scope: single implementation plan (routing refactor + 2 new components + guard + spec updates).
- Ambiguity resolved: splash = branding only; Start → `/start` (not instant lesson); child names locked to `vocab/words/story/sentences/quiz`.

## 10. Non-goals

- No lesson content changes, no new topics, no TTS greeting on splash, no auth, no backend changes.
- No commit performed with this spec (per repo NO AUTO-COMMIT policy — awaiting explicit instruction).
