import { Component, inject } from '@angular/core';
import { ProgressStore } from '../../../core/services/progress.store';
import { SettingsService } from '../../../core/services/settings.service';
import { TtsService } from '../../../core/services/tts.service';
@Component({
  selector: 'app-story-view',
  standalone: true,
  template: `@if (store.lesson(); as lesson) {
    <div class="bubble">Giỏi lắm {{ settings.kidOr() }} ơi! Cô kể cho {{ settings.kidOr() }} nghe câu chuyện nhỏ nhé 📖</div>
    <div class="row" style="margin-bottom:10px"><button class="btn ghost" (click)="guide()">🔊 Cô hướng dẫn lại</button></div>
    <div class="card">
    <h2 style="font-size:24px;margin-bottom:14px">{{ lesson.story.title }}</h2>
    <div class="story"><p class="en">{{ lesson.story.full_english }}</p><p class="vi">{{ lesson.story.full_vietnamese }}</p></div>
    <div class="row" style="margin-top:14px"><button class="btn" (click)="hear(0.9)">🔊 Nghe cô kể</button>
    <button class="btn" (click)="hear(0.3)">🐢 Nghe thật chậm</button>
    <button class="btn ghost" (click)="stop()">⏹ Dừng</button></div>
    </div>
    <button class="btn big go" (click)="next()">Luyện đọc từng câu 🎤</button>
  }`
})
export class StoryViewComponent {
  store = inject(ProgressStore);
  private tts = inject(TtsService);
  settings = inject(SettingsService);
  constructor() { this.guide(); }
  guide(): void {
    const s = this.store.lesson()?.story.full_english ?? '';
    const kid = this.settings.kidOr();
    this.tts.speak(`${kid} nghe cô kể chuyện nhé.`, { lang: 'vi', onend: () => { if (s) this.tts.speak(s, { lang: 'en', rate: 0.9 }); } });
  }
  hear(rate: 0.9 | 0.3): void {
    const s = this.store.lesson()?.story.full_english;
    if (s) this.tts.speak(s, { lang: 'en', rate });
  }
  stop(): void { this.tts.stop(); }
  next(): void { this.store.sentIdx.set(0); this.store.go(4); }
}
