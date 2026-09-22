import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressStore } from '../../../core/services/progress.store';
import { SettingsService } from '../../../core/services/settings.service';
import { TtsService } from '../../../core/services/tts.service';
import { TutorService } from '../../../core/services/tutor.service';
@Component({
  selector: 'app-result-view',
  standalone: true,
  template: `@if (store.lesson(); as lesson) {
    <div class="bubble">{{ message() }} Cô trao huy hiệu nè 🎉</div>
    <div class="row" style="margin-bottom:10px"><button class="btn ghost" (click)="guide()">🔊 Cô hướng dẫn lại</button></div>
    <div class="card">
    <div class="badge"><div class="medal">{{ medal() }}</div><div class="score">{{ right() }}/{{ lesson.quiz.length }}</div><div class="name">{{ badge() }}</div></div>
    <div class="review"><h3 style="font-size:19px;margin-bottom:10px">Cô Emily nhận xét</h3>
    @if (reviewLoading()) { <p class="muted">Cô đang viết nhận xét cho {{ settings.kidOr() }}...</p> }
    @else if (review()) { <p>{{ review() }}</p> }
    @else { <div class="fb retry">⚠️ Cô chưa viết được nhận xét. {{ settings.kidOr() }} kiểm tra mạng rồi thử lại nhé.</div>
      <div class="row" style="margin-top:8px"><button class="btn ghost" (click)="loadReview()">🔄 Thử lại</button></div> }
    </div>
    <div class="review"><h3 style="font-size:19px;margin-bottom:12px">Cùng cô xem lại nhé</h3>
    @for (q of lesson.quiz; track q.question; let i = $index) {
      <h4>{{ isOk(i) ? '✅' : '📌' }} Câu {{ i + 1 }}: {{ q.question }}</h4>
      <p>{{ q.explanation }}</p>
    }</div>
    <div class="review"><h3 style="font-size:19px;margin-bottom:10px">Ba từ {{ settings.kidOr() }} đã học hôm nay</h3>
    @for (w of lesson.vocab; track w.word) { <div class="vocab"><span class="pic">{{ w.emoji }}</span><span><span class="w">{{ w.word }}</span> <span class="ipa">{{ w.phonetics }}</span><br><span class="vi">{{ w.meaning }}</span></span></div> }</div>
    </div>
    <div class="row"><button class="btn" style="flex:1;justify-content:center" (click)="retry()">🔁 Làm lại bài đố</button>
    <button class="btn go" style="flex:1;justify-content:center" (click)="newTopic()">🎒 Học chủ đề mới</button></div>
  }`
})
export class ResultViewComponent {
  store = inject(ProgressStore);
  private router = inject(Router);
  private tts = inject(TtsService);
  private tutor = inject(TutorService);
  settings = inject(SettingsService);
  review = signal('');
  reviewLoading = signal(false);
  constructor() { this.guide(); void this.loadReview(); }
  async loadReview(): Promise<void> {
    const lesson = this.store.lesson();
    if (!lesson || this.reviewLoading()) return;
    this.reviewLoading.set(true);
    try {
      const text = await this.tutor.quizReview(lesson.quiz, this.store.answers());
      this.review.set(text ?? '');
    } finally { this.reviewLoading.set(false); }
  }
  guide(): void {
    const total = this.store.lesson()?.quiz.length ?? 0;
    const kid = this.settings.kidOr();
    this.tts.speak(`${this.message()} ${kid} được ${this.right()} trên ${total} câu đúng. Cô trao cho ${kid} huy hiệu ${this.badge()}!`, { lang: 'vi',
      onend: () => { const r = this.review(); if (r) this.tts.speakViMixed(r); } });
  }
  right(): number {
    const l = this.store.lesson();
    if (!l) return 0;
    return l.quiz.filter((q, i) => this.store.answers()[i] === q.correct).length;
  }
  medal(): string {
    const l = this.store.lesson();
    if (!l) return '🌱';
    const p = this.right() / l.quiz.length;
    if (p === 1) return '🏆';
    if (p >= 0.8) return '🥇';
    if (p >= 0.6) return '🥈';
    return '🌱';
  }
  badge(): string {
    const l = this.store.lesson();
    if (!l) return '';
    const p = this.right() / l.quiz.length;
    if (p >= 0.8) return 'Ngoại Ngữ Nhí Xuất Sắc';
    if (p >= 0.6) return 'Ngoại Ngữ Nhí Chăm Chỉ';
    return 'Ngoại Ngữ Nhí Cố Gắng';
  }
  message(): string {
    const l = this.store.lesson();
    if (!l) return '';
    const kid = this.settings.kidOr();
    const p = this.right() / l.quiz.length;
    if (p === 1) return 'Tuyệt vời! Trả lời đúng tất cả luôn!';
    if (p >= 0.6) return `${kid} làm tốt lắm! Cô rất tự hào.`;
    return `${kid} đã rất cố gắng rồi! Mình cùng ôn lại một chút nhé.`;
  }
  isOk(i: number): boolean {
    return this.store.answers()[i] === this.store.lesson()?.quiz[i].correct;
  }
  retry(): void { this.store.answers.set([]); this.store.qIdx.set(0); this.store.go(5); void this.router.navigate(['/learn/quiz']); }
  newTopic(): void { this.store.lesson.set(null); this.store.answers.set([]); this.store.go(0); void this.router.navigate(['/start']); }
}
