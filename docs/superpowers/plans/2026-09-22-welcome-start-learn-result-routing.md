# Welcome / Start / Learn / Result Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-shell stage-signal flow with router-driven `/welcome`, `/start`, `/learn/*`, `/result` flow.

**Architecture:** Router URL is outer truth; `ProgressStore` signals (`lesson`, `topic`, `wordIdx`, `sentIdx`, `qIdx`, `answers`) stay for lesson state; `stage` writes kept during migration for back-compat while rail/TTS read the URL. Two new standalone components (`Welcome`, `LearnShell`) plus `lessonGuard`.

**Tech Stack:** Angular 22 standalone components, `@angular/router` (`provideRouter`, `CanActivateFn`, `RouterOutlet`), RxJS `filter`, existing kid-palette CSS in `src/styles.css`.

## Global Constraints

- Language: ALWAYS respond in English.
- File links: every assistant response includes a link to the according file.
- Git: NEVER commit/push/add without EXPLICIT user confirmation (`yes`/`agree`/`approve` per change) — plan commit steps are approval gates, not auto-run.
- Jira: NEVER create/edit/comment/transition without EXPLICIT user confirmation.
- Permission: proposal before ANY state-changing execution; question is NOT an instruction.
- Edit workflow: GREP → PROPOSE → APPROVE → EDIT → VERIFY; always compile after edits (`npm run build`).
- Signals/observables MUST use `$` postfix for NEW signals (e.g. `routePath$`); existing store names (`stage`, `lesson`) kept untouched to limit churn.
- Reuse `src/styles.css` classes (`.btn.big.go`, `.card`, `.badge`, `.bigpic`); no new global CSS.
- Vietnamese copy matching existing tone.

---

## File Structure

- NEW `src/app/features/welcome/welcome.component.ts` — splash branding + Start → `/start`.
- NEW `src/app/features/welcome/welcome.component.spec.ts` — render + navigate test.
- NEW `src/app/features/learn/learn-shell.component.ts` — thin `<router-outlet>` wrapper for children.
- NEW `src/app/core/guards/lesson.guard.ts` — blocks `/learn/*` + `/result` when no lesson.
- NEW `src/app/core/guards/lesson.guard.spec.ts` — guard true / UrlTree tests.
- MODIFY `src/app/app.routes.ts` — full route tree (currently `[]`).
- MODIFY `src/app/app.ts` — RouterOutlet shell, rail-from-URL, TTS stop on NavigationEnd.
- MODIFY `src/app/app.html` — replace `@switch(stage)` with `<router-outlet>`.
- MODIFY `src/app/features/lesson/topic-picker/topic-picker.component.ts:60-70` — `go(1)` + navigate `/learn/vocab`.
- MODIFY `src/app/features/lesson/vocab-intro/vocab-intro.component.ts:37` — `go(2)` + navigate `/learn/words`.
- MODIFY `src/app/features/lesson/word-practice/word-practice.component.ts:127-137` — back/next + navigate.
- MODIFY `src/app/features/lesson/story-view/story-view.component.ts:36` — `go(4)` + navigate `/learn/sentences`.
- MODIFY `src/app/features/lesson/sentence-practice/sentence-practice.component.ts:123-133` — back/next + navigate.
- MODIFY `src/app/features/lesson/quiz-step/quiz-step.component.ts:81-89` — last-next + navigate `/result`.
- MODIFY `src/app/features/lesson/result-view/result-view.component.ts:89-90` — retry/newTopic + navigate.
- MODIFY `src/app/app.spec.ts` — shell asserts router-outlet.
- CHECK `ngsw-config.json` — SPA navigation URLs work offline (no code change expected).

---

### Task 1: WelcomeComponent (splash)

**Files:**
- Create: `src/app/features/welcome/welcome.component.ts`
- Test: `src/app/features/welcome/welcome.component.spec.ts`

**Interfaces:**
- Consumes: `@angular/router` `Router.navigate`
- Produces: `WelcomeComponent.start()` → `Promise<boolean>` navigating to `/start`; selector `app-welcome`

- [ ] **Step 1: Write the failing test**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WelcomeComponent } from './welcome.component';

describe('WelcomeComponent', () => {
  it('renders start button and navigates to /start', async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeComponent, provideRouter([{ path: 'start', component: WelcomeComponent }])],
    }).compileComponents();
    const fixture = TestBed.createComponent(WelcomeComponent);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button.go');
    expect(btn?.textContent).toContain('Bắt đầu');
    await fixture.componentInstance.start();
    const { inject } = await import('@angular/core');
    const { Router } = await import('@angular/router');
    expect(TestBed.inject(Router).url).toBe('/start');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --include='**/welcome.component.spec.ts'`
Expected: FAIL with "WelcomeComponent not defined / No provider"

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  template: `<div class="card" style="text-align:center">
    <div class="bigpic" aria-hidden="true">👩‍🏫</div>
    <h1 class="display" style="font-size:34px;margin:8px 0 4px">Cô Emily</h1>
    <p class="muted" style="margin:0 0 18px">Lớp tiếng Anh vui vẻ</p>
    <button class="btn big go" (click)="start()">Bắt đầu 🎒</button>
  </div>`,
})
export class WelcomeComponent {
  private router = inject(Router);
  start(): Promise<boolean> {
    return this.router.navigate(['/start']);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --include='**/welcome.component.spec.ts'`
Expected: PASS (1 spec)

- [ ] **Step 5: Commit (APPROVAL GATE — ask `yes/agree/approve` before running)**

```bash
git add src/app/features/welcome/welcome.component.ts src/app/features/welcome/welcome.component.spec.ts
git commit -m "feat: add welcome splash with start button"
```

---

### Task 2: Routes + lessonGuard + LearnShell

**Files:**
- Create: `src/app/core/guards/lesson.guard.ts`
- Create: `src/app/features/learn/learn-shell.component.ts`
- Modify: `src/app/app.routes.ts`
- Test: `src/app/core/guards/lesson.guard.spec.ts`

**Interfaces:**
- Consumes: `ProgressStore.lesson()`, `Router.parseUrl`
- Produces: `lessonGuard: CanActivateFn`; `LearnShellComponent` with `<router-outlet>`; `routes: Routes`

- [ ] **Step 1: Write the failing guard test**

```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { lessonGuard } from './lesson.guard';
import { ProgressStore } from '../services/progress.store';
import { provideRouter } from '@angular/router';
import { WelcomeComponent } from '../../features/welcome/welcome.component';

describe('lessonGuard', () => {
  it('redirects to /start when no lesson', async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'start', component: WelcomeComponent }])],
    }).compileComponents();
    TestBed.inject(ProgressStore).lesson.set(null);
    const result = TestBed.runInInjectionContext(() =>
      lessonGuard({} as never, {} as never),
    );
    expect(String(result)).toContain('/start');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --include='**/lesson.guard.spec.ts'`
Expected: FAIL with "lesson.guard not found"

- [ ] **Step 3: Write minimal implementation**

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ProgressStore } from '../services/progress.store';

export const lessonGuard: CanActivateFn = () => {
  const store = inject(ProgressStore);
  const router = inject(Router);
  return store.lesson() ? true : router.parseUrl('/start');
};
```

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({ selector: 'app-learn-shell', standalone: true, imports: [RouterOutlet], template: `<router-outlet></router-outlet>` })
export class LearnShellComponent {}
```

```typescript
import { Routes } from '@angular/router';
import { WelcomeComponent } from './features/welcome/welcome.component';
import { TopicPickerComponent } from './features/lesson/topic-picker/topic-picker.component';
import { LearnShellComponent } from './features/learn/learn-shell.component';
import { VocabIntroComponent } from './features/lesson/vocab-intro/vocab-intro.component';
import { WordPracticeComponent } from './features/lesson/word-practice/word-practice.component';
import { StoryViewComponent } from './features/lesson/story-view/story-view.component';
import { SentencePracticeComponent } from './features/lesson/sentence-practice/sentence-practice.component';
import { QuizStepComponent } from './features/lesson/quiz-step/quiz-step.component';
import { ResultViewComponent } from './features/lesson/result-view/result-view.component';
import { lessonGuard } from './core/guards/lesson.guard';

export const routes: Routes = [
  { path: 'welcome', component: WelcomeComponent },
  { path: 'start', component: TopicPickerComponent },
  {
    path: 'learn',
    component: LearnShellComponent,
    canActivate: [lessonGuard],
    children: [
      { path: 'vocab', component: VocabIntroComponent },
      { path: 'words', component: WordPracticeComponent },
      { path: 'story', component: StoryViewComponent },
      { path: 'sentences', component: SentencePracticeComponent },
      { path: 'quiz', component: QuizStepComponent },
      { path: '', redirectTo: 'vocab', pathMatch: 'full' },
    ],
  },
  { path: 'result', component: ResultViewComponent, canActivate: [lessonGuard] },
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
  { path: '**', redirectTo: 'welcome' },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --include='**/lesson.guard.spec.ts'`
Expected: PASS

- [ ] **Step 5: Commit (APPROVAL GATE)**

```bash
git add src/app/app.routes.ts src/app/core/guards/lesson.guard.ts src/app/core/guards/lesson.guard.spec.ts src/app/features/learn/learn-shell.component.ts
git commit -m "feat: add app routes with learn children and lesson guard"
```

---

### Task 3: App shell on router (rail-from-URL + TTS stop)

**Files:**
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`
- Test: `src/app/app.spec.ts`

**Interfaces:**
- Consumes: `Router.url`, `NavigationEnd`
- Produces: `App.railIndexFromUrl(url: string): number`; `routePath$` signal; template uses `<router-outlet>`

- [ ] **Step 1: Write the failing test (update shell spec)**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App shell', () => {
  it('exposes router-outlet for routed flow', async () => {
    await TestBed.configureTestingModule({ imports: [App, provideRouter(routes)] }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).toBeTruthy();
    expect(fixture.componentInstance.railIndexFromUrl('/learn/quiz')).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --include='**/app.spec.ts'`
Expected: FAIL (`railIndexFromUrl` undefined / no `router-outlet`)

- [ ] **Step 3: Write minimal implementation**

`src/app/app.html` (replace entire `@switch(stage)` block, keep topbar; hide rail on `/welcome`):

```html
<div class="wrap">
  <div class="topbar">
    <div class="emily" [class.talking]="tts.talking()" aria-hidden="true">👩‍🏫</div>
    <div>
      <h1>Cô Emily</h1>
      <p>Lớp tiếng Anh vui vẻ của {{ settings.kidOr() }}</p>
    </div>
  </div>
  @if (routePath$() !== '/welcome') {
    <div class="rail" aria-hidden="true">
      @for (s of stages; track s.name; let i = $index) { <i [class]="railClass(i)"></i> }
    </div>
    <div class="raillbl"><span>{{ stages[railIndexFromUrl(routePath$())].name }}</span></div>
  }
  <app-api-key-bar></app-api-key-bar>
  @if (updateReady$()) {
    <div class="bubble" role="status">Cô có bản mới nè! <button class="btn ghost" (click)="reload()">Tải lại</button></div>
  }
  <main aria-live="polite"><router-outlet></router-outlet></main>
</div>
```

`src/app/app.ts` key changes (keep `stages` array as-is):

```typescript
import { Component, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { ProgressStore } from './core/services/progress.store';
import { TtsService } from './core/services/tts.service';
import { SettingsService } from './core/services/settings.service';
import { ApiKeyBarComponent } from './features/lesson/api-key-bar/api-key-bar.component';

@Component({
  imports: [RouterOutlet, ApiKeyBarComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  store = inject(ProgressStore);
  tts = inject(TtsService);
  settings = inject(SettingsService);
  sw = inject(SwUpdate, { optional: true });
  private router = inject(Router);
  updateReady$ = signal(false);
  routePath$ = signal<string>(this.router.url || '/welcome');
  constructor() {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.routePath$.set(e.urlAfterRedirects);
      this.tts.stop();
      window.scrollTo({ top: 0 });
    });
    this.sw?.versionUpdates.subscribe((e) => {
      if (e.type === 'VERSION_READY') this.updateReady$.set(true);
    });
  }
  reload(): void {
    document.location.reload();
  }
  stages = [
    { name: 'Chọn chủ đề', steps: '1–2' },
    { name: 'Từ mới hôm nay', steps: '3' },
    { name: 'Luyện đọc từ', steps: '4' },
    { name: 'Câu chuyện', steps: '5' },
    { name: 'Luyện đọc câu', steps: '6' },
    { name: 'Đố vui', steps: '7–8' },
    { name: 'Tổng kết', steps: '9' },
  ];
  railIndexFromUrl(url: string): number {
    const path = url.split('?')[0];
    if (path.startsWith('/result')) return 6;
    if (path.startsWith('/learn/quiz')) return 5;
    if (path.startsWith('/learn/sentences')) return 4;
    if (path.startsWith('/learn/story')) return 3;
    if (path.startsWith('/learn/words')) return 2;
    if (path.startsWith('/learn')) return 1;
    return 0;
  }
  railClass(i: number): string {
    const cur = this.railIndexFromUrl(this.routePath$());
    if (i < cur) return 'done';
    if (i === cur) return 'now';
    return '';
  }
}
```

- [ ] **Step 4: Run tests + build**

Run: `npm test -- --watch=false --include='**/app.spec.ts'`
Expected: PASS
Run: `npm run build`
Expected: `Application bundle generation complete`

- [ ] **Step 5: Commit (APPROVAL GATE)**

```bash
git add src/app/app.ts src/app/app.html src/app/app.spec.ts
git commit -m "refactor: app shell uses router outlet with url-driven rail"
```

---

### Task 4: TopicPicker → /learn/vocab

**Files:**
- Modify: `src/app/features/lesson/topic-picker/topic-picker.component.ts`

**Interfaces:**
- Consumes: `LessonService.generate`, `ProgressStore`
- Produces: `start()` navigates to `/learn/vocab` on success (keeps `store.go(1)` for back-compat)

- [ ] **Step 1: Write the failing test**

```typescript
// extend topic-picker spec: mock LessonService.generate resolving a minimal lesson,
// spy on Router.navigate, call start(), expect navigate called with ['/learn/vocab']
```

Concrete assertion to add:

```typescript
expect(routerSpy.navigate).toHaveBeenCalledWith(['/learn/vocab']);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --include='**/topic-picker*'`
Expected: FAIL (`navigate` never called)

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Router } from '@angular/router';
// add: private router = inject(Router);
// in start() success block, replace `this.store.go(1);` with:
this.store.go(1);
void this.router.navigate(['/learn/vocab']);
```

Full success block:

```typescript
const lesson = await this.lessons.generate(t);
this.store.lesson.set(lesson);
this.store.wordIdx.set(0);
this.store.go(1);
void this.router.navigate(['/learn/vocab']);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --include='**/topic-picker*'`
Expected: PASS

- [ ] **Step 5: Commit (APPROVAL GATE)**

```bash
git add src/app/features/lesson/topic-picker/topic-picker.component.ts
git commit -m "feat: topic picker navigates to learn vocab"
```

---

### Task 5: Learn steps navigate between children

**Files:**
- Modify: `src/app/features/lesson/vocab-intro/vocab-intro.component.ts`
- Modify: `src/app/features/lesson/word-practice/word-practice.component.ts`
- Modify: `src/app/features/lesson/story-view/story-view.component.ts`
- Modify: `src/app/features/lesson/sentence-practice/sentence-practice.component.ts`
- Modify: `src/app/features/lesson/quiz-step/quiz-step.component.ts`

**Interfaces:**
- Consumes: `Router.navigate`, `ProgressStore` indices
- Produces: vocab→`/learn/words`; words-last→`/learn/story`; story→`/learn/sentences`; sentences-last→`/learn/quiz`; quiz-last→`/result`

- [ ] **Step 1: Write the failing tests** (one assertion per component spec)

```typescript
// vocab-intro: next() → ['/learn/words']
// word-practice: next() at last index → ['/learn/story']; back() at 0 → ['/learn/vocab']
// story-view: next() → ['/learn/sentences']
// sentence-practice: next() at last → ['/learn/quiz']; back() at 0 → ['/learn/story']
// quiz-step: next() at last → ['/result']
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --watch=false --include='**/vocab-intro*' --include='**/word-practice*' --include='**/story-view*' --include='**/sentence-practice*' --include='**/quiz-step*'`
Expected: FAIL (navigate never called)

- [ ] **Step 3: Write minimal implementation** (each keeps existing `store.go()` + adds navigate)

```typescript
// vocab-intro.component.ts
import { Router } from '@angular/router';
private router = inject(Router);
next(): void { this.store.wordIdx.set(0); this.store.go(2); void this.router.navigate(['/learn/words']); }
```

```typescript
// word-practice.component.ts
back(): void {
  this.feedback.set('');
  if (this.store.wordIdx() > 0) this.store.wordIdx.update((v) => v - 1);
  else { this.store.go(1); void this.router.navigate(['/learn/vocab']); }
}
next(): void {
  this.feedback.set('');
  const len = this.store.lesson()?.vocab.length ?? 3;
  if (this.store.wordIdx() >= len - 1) { this.store.go(3); void this.router.navigate(['/learn/story']); }
  else this.store.wordIdx.update((v) => v + 1);
}
```

```typescript
// story-view.component.ts
next(): void { this.store.sentIdx.set(0); this.store.go(4); void this.router.navigate(['/learn/sentences']); }
```

```typescript
// sentence-practice.component.ts
back(): void {
  this.feedback.set('');
  if (this.store.sentIdx() > 0) this.store.sentIdx.update((v) => v - 1);
  else { this.store.go(3); void this.router.navigate(['/learn/story']); }
}
next(): void {
  this.feedback.set('');
  const len = this.store.lesson()?.story.english.length ?? 1;
  if (this.store.sentIdx() >= len - 1) { this.store.qIdx.set(0); this.store.answers.set([]); this.store.go(5); void this.router.navigate(['/learn/quiz']); }
  else this.store.sentIdx.update((v) => v + 1);
}
```

```typescript
// quiz-step.component.ts
next(): void {
  this.locked.set(false);
  this.storyOpen.set(false);
  this.picked = null;
  this.fbCls.set('ok');
  this.msg.set('');
  if (this.isLast()) { this.store.go(6); void this.router.navigate(['/result']); }
  else this.store.qIdx.update((v) => v + 1);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: same include set as Step 2
Expected: PASS

- [ ] **Step 5: Commit (APPROVAL GATE)**

```bash
git add src/app/features/lesson/vocab-intro src/app/features/lesson/word-practice src/app/features/lesson/story-view src/app/features/lesson/sentence-practice src/app/features/lesson/quiz-step
git commit -m "feat: learn steps navigate between child routes"
```

---

### Task 6: ResultView exits + store cleanup

**Files:**
- Modify: `src/app/features/lesson/result-view/result-view.component.ts`
- Modify: `src/app/core/services/progress.store.ts` (deprecate note only, no deletion)
- Test: `src/app/core/services/progress.store.spec.ts` (kept passing)

**Interfaces:**
- Consumes: `Router.navigate`
- Produces: `retry()` → `/learn/quiz`; `newTopic()` → `/start`

- [ ] **Step 1: Write the failing test**

```typescript
// result-view spec: retry() expects navigate ['/learn/quiz']; newTopic() expects ['/start']
expect(routerSpy.navigate).toHaveBeenCalledWith(['/learn/quiz']);
expect(routerSpy.navigate).toHaveBeenCalledWith(['/start']);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --include='**/result-view*'`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Router } from '@angular/router';
private router = inject(Router);
retry(): void { this.store.answers.set([]); this.store.qIdx.set(0); this.store.go(5); void this.router.navigate(['/learn/quiz']); }
newTopic(): void { this.store.lesson.set(null); this.store.answers.set([]); this.store.go(0); void this.router.navigate(['/start']); }
```

In `progress.store.ts` add deprecation comment above `stage` (no behavior change):

```typescript
/** @deprecated Router URL is now the outer truth (see app.routes.ts); kept for back-compat during migration. */
readonly stage = signal(0);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --watch=false --include='**/result-view*' --include='**/progress.store.spec.ts'`
Expected: PASS

- [ ] **Step 5: Commit (APPROVAL GATE)**

```bash
git add src/app/features/lesson/result-view/result-view.component.ts src/app/core/services/progress.store.ts
git commit -m "feat: result view navigates to quiz retry or new topic"
```

---

### Task 7: PWA check + full verify

**Files:**
- Check: `ngsw-config.json` (read-only unless navigation fix needed)
- Verify: full test + build

- [ ] **Step 1: Confirm SPA routes work offline**

Check `ngsw-config.json` has no `navigationUrls` blocking `/welcome|/start|/learn|/result`. Default Angular SW serves `index.html` for navigations — no change expected. If a custom `navigationUrls` deny exists, add an allow entry (show exact diff in proposal before editing).

- [ ] **Step 2: Run full unit suite**

Run: `npm test -- --watch=false`
Expected: PASS (all specs green)

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: `Application bundle generation complete`, no budget errors

- [ ] **Step 4: Manual click-through**

`npm start` → open `https://localhost:4200/welcome` → Start → pick topic → vocab → words → story → sentences → quiz → result → "Học chủ đề mới" → `/start`. Deep-link check: direct `/learn/vocab` with no lesson → redirects `/start`.

- [ ] **Step 5: Commit docs (APPROVAL GATE)**

```bash
git add docs/superpowers/plans/2026-09-22-welcome-start-learn-result-routing.md docs/superpowers/specs/2026-09-22-welcome-start-learn-result-routing-design.md
git commit -m "docs: add routing plan and spec"
```

---

## Self-Review

- Spec coverage: `/welcome` (Task 1), route tree + guard + `/learn` children (Task 2), shell/rail/TTS (Task 3), `/start`→learn (Task 4), 5 child navigations (Task 5), `/result` exits (Task 6), PWA + verify (Task 7). All spec sections 2–7 mapped.
- Placeholder scan: no TBD/TODO; every code step shows exact imports, signatures, and literal route strings; commands include expected output.
- Type consistency: `railIndexFromUrl(url: string): number`, `start(): Promise<boolean>`, `lessonGuard: CanActivateFn`, `routePath$ = signal<string>` used consistently; existing store names unchanged.
