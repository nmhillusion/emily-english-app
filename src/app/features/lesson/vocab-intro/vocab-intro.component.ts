import { Component, inject } from '@angular/core';
import { ProgressStore } from '../../../core/services/progress.store';
import { SettingsService } from '../../../core/services/settings.service';
import { TtsService } from '../../../core/services/tts.service';
@Component({
  selector: 'app-vocab-intro',
  standalone: true,
  template: `@if (store.lesson(); as lesson) {
    <div class="bubble">Hôm nay cô trò mình học về <b>{{ store.topic() }}</b> {{ lesson.topic_emoji }} nhé! Cô có <b>3 từ mới</b> tặng {{ settings.kidOr() }} đây 🎁</div>
    <div class="row" style="margin-bottom:10px"><button class="btn ghost" (click)="guide()">🔊 Cô hướng dẫn lại</button></div>
    <div class="card">
    @for (w of lesson.vocab; track w.word) {
      <div class="vocab"><span class="pic">{{ w.emoji }}</span><span><span class="w">{{ w.word }}</span> <span class="ipa">{{ w.phonetics }}</span><br><span class="vi">{{ w.meaning }}</span></span></div>
    }
    <div class="row"><button class="btn" (click)="hearAll()">🔊 Nghe cô đọc cả 3 từ</button></div>
    </div>
    <button class="btn big go" (click)="next()">Luyện đọc cùng cô nào! 🎤</button>
  }`
})
export class VocabIntroComponent {
  store = inject(ProgressStore);
  private tts = inject(TtsService);
  settings = inject(SettingsService);
  constructor() { this.guide(); }
  guide(): void {
    this.tts.speak('Hôm nay cô trò mình học ba từ mới thật thú vị nhé!', { lang: 'vi', onend: () => this.hearAll() });
  }
  hearAll(): void {
    const words = this.store.lesson()?.vocab.map(w => w.word) ?? [];
    const chain = (i: number): void => {
      if (i >= words.length) return;
      this.tts.speak(words[i], { lang: 'en', rate: 0.9 });
      setTimeout(() => chain(i + 1), 1200);
    };
    chain(0);
  }
  next(): void { this.store.wordIdx.set(0); this.store.go(2); }
}
