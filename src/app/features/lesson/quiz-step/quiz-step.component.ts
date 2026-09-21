import { Component, effect, inject, signal } from '@angular/core';
import { ProgressStore } from '../../../core/services/progress.store';
import { SettingsService } from '../../../core/services/settings.service';
import { TtsService } from '../../../core/services/tts.service';
@Component({
  selector: 'app-quiz-step',
  standalone: true,
  template: `@if (store.lesson(); as lesson) {
    @if (lesson.quiz[store.qIdx()]; as q) {
      <div class="bubble">{{ settings.kidOr() }} giỏi lắm! Giờ là phần <b>đố vui</b> 🧩 Suy nghĩ kỹ rồi chọn nhé.</div>
      <div class="row" style="margin-bottom:10px"><button class="btn ghost" (click)="guide()">🔊 Cô hướng dẫn lại</button></div>
      @if (q.aboutStory) {
        <details class="card" style="margin-bottom:10px" [open]="storyOpen()" (toggle)="storyOpen.set($any($event.target).open)"><summary>📖 Xem lại câu chuyện</summary><div class="story"><p class="en">{{ lesson.story.full_english }}</p><p class="vi">{{ lesson.story.full_vietnamese }}</p></div><div class="row" style="margin-top:10px"><button class="btn ghost" (click)="hearStory()">🔊 Nghe lại truyện</button></div></details>
      }
      <div class="card">
      <div class="qnum">Câu {{ store.qIdx() + 1 }} / {{ lesson.quiz.length }}</div>
      <div class="qtext">{{ q.question }}</div>
      @for (o of q.options; track o; let i = $index) {
        <button class="opt {{ optCls(i, q.correct) }}" (click)="answer(i)" [disabled]="locked()">{{ 'ABC'[i] }}. {{ o }}</button>
      }
      <div class="row"><button class="btn ghost" (click)="hint()">💡 Cô gợi ý</button></div>
      @if (msg()) { <div class="fb {{ fbCls() }}" [innerHTML]="msg()"></div> }
      </div>
      @if (locked()) { <button class="btn big go" (click)="next()">{{ isLast() ? 'Xem kết quả 🏅' : 'Câu tiếp theo →' }}</button> }
    }
  }`
})
export class QuizStepComponent {
  store = inject(ProgressStore);
  private tts = inject(TtsService);
  settings = inject(SettingsService);
  msg = signal('');
  fbCls = signal<'good' | 'ok' | 'retry'>('ok');
  locked = signal(false);
  storyOpen = signal(false);
  picked: number | null = null;
  constructor() {
    effect(() => { this.store.qIdx(); this.store.lesson(); this.storyOpen.set(false); this.guide(); });
  }
  guide(): void {
    const q = this.store.lesson()?.quiz[this.store.qIdx()];
    if (q) this.tts.speakViMixed(q.question);
  }
  hearStory(): void {
    const s = this.store.lesson()?.story.full_english;
    if (s) this.tts.speak(s, { lang: 'en', rate: 0.9 });
  }
  optCls(i: number, correct: number): string {
    if (!this.locked() || this.picked === null) return '';
    if (i === correct) return 'right';
    if (i === this.picked) return 'wrong';
    return '';
  }
  isLast(): boolean {
    const len = this.store.lesson()?.quiz.length ?? 5;
    return this.store.qIdx() >= len - 1;
  }
  hint(): void {
    const q = this.store.lesson()?.quiz[this.store.qIdx()];
    if (!q) return;
    if (q.aboutStory) this.storyOpen.set(true);
    this.msg.set(`💡 ${q.hint}`);
    this.fbCls.set('ok');
    this.tts.speakViMixed(q.hint);
  }
  answer(pick: number): void {
    const lesson = this.store.lesson();
    if (!lesson || this.locked()) return;
    const q = lesson.quiz[this.store.qIdx()];
    const arr = [...this.store.answers()];
    arr[this.store.qIdx()] = pick;
    this.store.answers.set(arr);
    const ok = pick === q.correct;
    this.picked = pick;
    this.fbCls.set(ok ? 'good' : 'retry');
    const kid = this.settings.kidOr();
    this.msg.set(`${ok ? '🌟 <b>Chính xác! Giỏi lắm!</b> ' : '💗 <b>Gần đúng rồi!</b> '}${q.explanation}`);
    this.tts.speak(ok ? `Chính xác! ${kid} giỏi lắm!` : `Chưa đúng rồi, ${kid} nghe cô giải thích nhé.`, { lang: 'vi' });
    this.locked.set(true);
  }
  next(): void {
    this.locked.set(false);
    this.storyOpen.set(false);
    this.picked = null;
    this.fbCls.set('ok');
    this.msg.set('');
    if (this.isLast()) this.store.go(6);
    else this.store.qIdx.update(v => v + 1);
  }
}
