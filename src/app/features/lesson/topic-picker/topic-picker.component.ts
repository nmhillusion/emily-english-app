import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProgressStore } from '../../../core/services/progress.store';
import { LessonService } from '../../../core/services/lesson.service';
import { SettingsService } from '../../../core/services/settings.service';
import { TtsService } from '../../../core/services/tts.service';
const TOPICS: [string, string][] = [
  ['Vật nuôi','🐶'],['Trái cây','🍎'],['Khủng long','🦕'],['Vũ trụ','🚀'],
  ['Đi công viên','🎠'],['Màu sắc','🎨'],['Con số','🔢'],['Đồ ăn','🍜'],
  ['Trường học','🏫'],['Biển cả','🐠'],['Thời tiết','⛅'],['Gia đình','👨‍👩‍👧']
];
@Component({
  selector: 'app-topic-picker',
  standalone: true,
  imports: [FormsModule],
  template: `@if (!settings.kidName$()) {
    <div class="bubble">Chào em! Cô là <b>Cô Emily</b> đây 💛 Cô muốn biết tên của em để gọi cho thân mật nào!</div>
    <div class="card">
      <input type="text" [(ngModel)]="nameDraft" placeholder="Em tên là gì?" aria-label="Tên của em">
      <div class="row" style="margin-top:10px"><button class="btn big go" (click)="saveName()" [disabled]="!nameDraft.trim()">Nhớ tên em nhé! 🎒</button></div>
    </div>
  } @else {
  <div class="bubble">Chào {{ settings.kidOr() }}! Cô là <b>Cô Emily</b> đây 💛 Hôm nay {{ settings.kidOr() }} muốn học chủ đề gì nào?</div>
  <div class="row" style="margin-bottom:10px"><button class="btn ghost" (click)="guide()">🔊 Cô hướng dẫn lại</button></div>
  <div class="card">
  <input type="text" [(ngModel)]="topic" placeholder="Ví dụ: Khủng long, Vũ trụ..." aria-label="Chủ đề">
  <div class="chips">@for (t of topics; track t[0]) { <button class="chip" (click)="pick(t[0])">{{t[1]}} {{t[0]}}</button> } </div>
  </div>
  <button class="btn big go" (click)="start()" [disabled]="loading()">Bắt đầu học nào! 🎒</button>
  @if (loading()) { <div class="card loading"><p>Cô đang soạn bài cho {{ settings.kidOr() }}...</p></div> }
  @if (error()) { <div class="card"><div class="fb retry">{{ error() }}</div></div> } }`
})
export class TopicPickerComponent {
  private store = inject(ProgressStore);
  private lessons = inject(LessonService);
  private router = inject(Router);
  private tts = inject(TtsService);
  settings = inject(SettingsService);
  topics = TOPICS;
  topic = '';
  nameDraft = '';
  loading = signal(false);
  error = signal('');
  private greeted = false;
  constructor() {
    // Greet once Vietnamese voices exist and the name is known.
    effect(() => {
      if (this.greeted || !this.tts.voicesFor('vi').length || !this.settings.getKidName()) return;
      this.greeted = true;
      this.guide();
    });
  }
  guide(): void {
    this.tts.speak(`Chào ${this.settings.kidOr()}! Hôm nay muốn học tiếng Anh về chủ đề gì nào?`, { lang: 'vi' });
  }
  saveName(): void {
    this.settings.setKidName(this.nameDraft);
    this.nameDraft = '';
  }
  pick(t: string): void { this.topic = t; void this.start(); }
  async start(): Promise<void> {
    const t = this.topic.trim();
    if (!t) return;
    this.loading.set(true);
    this.error.set('');
    this.store.topic.set(t);
    try {
      const lesson = await this.lessons.generate(t);
      this.store.lesson.set(lesson);
      this.store.wordIdx.set(0);
      this.store.go(1);
      void this.router.navigate(['/learn/vocab']);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      this.error.set(code === 'no-key'
        ? `Cô cần API key để soạn bài. ${this.settings.kidOr()} mở ⚙️ Cài đặt dán key giúp cô nhé.`
        : 'Cô không soạn được bài lúc này. Kiểm tra mạng rồi bấm Bắt đầu lại nhé.');
    } finally { this.loading.set(false); }
  }
}
