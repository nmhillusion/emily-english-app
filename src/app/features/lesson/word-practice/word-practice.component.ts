import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressStore } from '../../../core/services/progress.store';
import { TtsService } from '../../../core/services/tts.service';
import { MicService } from '../../../core/services/mic.service';
import { PronunciationService } from '../../../core/services/pronunciation.service';
import { SettingsService } from '../../../core/services/settings.service';
@Component({
  selector: 'app-word-practice',
  standalone: true,
  template: `@if (store.lesson(); as lesson) {
    @if (lesson.vocab[store.wordIdx()]; as w) {
      <div class="bubble">Từ thứ <b>{{ store.wordIdx() + 1 }}</b> trong <b>{{ lesson.vocab.length }}</b> — {{ settings.kidOr() }} nghe cô đọc mẫu rồi đọc lại nha!</div>
      <div class="row" style="margin-bottom:10px"><button class="btn ghost" (click)="guide()">🔊 Cô hướng dẫn lại</button></div>
      <div class="card">
      <div class="bigpic">{{ w.emoji }}</div>
      <div class="bigword">{{ w.word }}</div>
      <div class="bigipa">{{ w.phonetics }}</div>
      <div class="bigvi">{{ w.meaning }}</div>
      @if (w.tip) { <div class="note">🗣️ {{ w.tip }}</div> }
      <div class="row"><button class="btn" (click)="hear(0.9)">🔊 Nghe cô đọc</button>
      <button class="btn" (click)="hear(0.3)">🐢 Nghe thật chậm</button></div>
      <div class="row" style="margin-top:12px">
        @if (audioOn()) {
          <button class="btn mic big rec" (click)="doMic()">■ Dừng ({{ (pron.elapsedMs$() / 1000).toFixed(1) }}s)</button>
        } @else if (pron.phase$() === 'analyzing') {
          <button class="btn mic big" disabled>Cô đang nghe kỹ... 🎧</button>
        } @else {
          <button class="btn mic big" (click)="doMic()" [disabled]="!canMic() || recording()">🎤 {{ settings.kidOr() }} đọc lại nào</button>
        }
      </div>
      @if (!canMic()) { <p class="muted">Cần API key để Cô chấm phát âm. {{ settings.kidOr() }} mở ⚙️ dán key nhé.</p> }
      @if (feedback()) { <div class="fb {{ fbCls() }}" [innerHTML]="feedback()"></div> }
      </div>
      <div class="row"><button class="btn ghost" (click)="back()">← Từ trước</button>
      <button class="btn go" style="flex:1;justify-content:center" (click)="next()">Từ tiếp theo →</button></div>
    }
  }`
})
export class WordPracticeComponent {
  store = inject(ProgressStore);
  private router = inject(Router);
  private tts = inject(TtsService);
  mic = inject(MicService);
  pron = inject(PronunciationService);
  settings = inject(SettingsService);
  feedback = signal('');
  fbCls = signal<'good' | 'ok' | 'retry'>('ok');
  recording = signal(false);
  audioOn = signal(false);
  constructor() {
    effect(() => { this.store.wordIdx(); this.store.lesson(); this.guide(); });
  }
  guide(): void {
    const i = this.store.wordIdx();
    const w = this.store.lesson()?.vocab[i];
    if (!w) return;
    const kid = this.settings.kidOr();
    const how = w.tip || `${kid} mở khẩu hình rộng, đọc to rõ từng âm nhé.`;
    this.tts.speak(`Từ thứ ${i + 1} là`, { lang: 'vi' });
    this.tts.speak(w.word, { lang: 'en', rate: 0.9 });
    this.tts.speakViMixed(`${how} ${kid} nghe cô đọc mẫu nhé.`);
    this.tts.speak(w.word, { lang: 'en', rate: 0.9 });
  }
  hear(rate: 0.9 | 0.3): void {
    const w = this.store.lesson()?.vocab[this.store.wordIdx()];
    if (w) this.tts.speak(w.word, { lang: 'en', rate });
  }
  canMic(): boolean {
    return this.pron.audioReady();
  }
  async doMic(): Promise<void> {
    const w = this.store.lesson()?.vocab[this.store.wordIdx()];
    if (!w || this.recording() || this.pron.phase$() === 'analyzing') return;
    this.tts.stop();
    if (this.audioOn()) { this.pron.requestStop(); return; }
    if (!this.pron.audioReady()) {
      this.fbCls.set('retry');
      this.feedback.set(`🔑 <b>Cần API key để Cô chấm phát âm.</b> ${this.settings.kidOr()} mở ⚙️ dán key rồi thử lại nhé.`);
      return;
    }
    await this.doAudio(w.word, w.phonetics, 5000);
  }
  private async doAudio(target: string, phonetics: string, maxMs: number): Promise<void> {
    this.audioOn.set(true);
    this.feedback.set('');
    const auditP = this.pron.transcribeAudit();
    let blob: Blob;
    try {
      blob = await this.pron.record(maxMs);
    } catch (err) {
      const info = this.mic.describeMicError(err);
      this.fbCls.set('retry');
      this.feedback.set(info.html);
      this.tts.speak(info.say, { lang: 'vi' });
      return;
    } finally { this.audioOn.set(false); }
    this.recording.set(true);
    try {
      const audit = await auditP;
      const a = await this.pron.assessAudio(blob, target, phonetics, audit);
      if (a) { this.showVerdict(target, a.score, a.heard, a.badParts, a.tipVi, a.pass); return; }
      this.fbCls.set('retry');
      const issue = this.pron.assessIssue$() === 'model-audio'
        ? `Model đang chọn không nhận file audio. ${this.settings.kidOr()} vào ⚙️ đổi model khác hỗ trợ audio nhé.`
        : `Cô không chấm được bài này. ${this.settings.kidOr()} kiểm tra mạng rồi bấm micro thử lại nhé.`;
      this.feedback.set(`⚠️ <b>${issue}</b>`);
      this.tts.speak(`Cô chưa chấm được. ${this.settings.kidOr()} thử lại nhé.`, { lang: 'vi' });
    } finally { this.recording.set(false); }
  }
  private showVerdict(target: string, score: number, heard: string, badParts: string[], tipVi: string, pass: boolean): void {
    const kid = this.settings.kidOr();
    this.fbCls.set(score >= 70 ? 'good' : score >= 45 ? 'ok' : 'retry');
    const praise = score >= 85 ? 'Xuất sắc quá!' : score >= 70 ? 'Khá lắm!' : 'Cố lên nào!';
    const head = score >= 85 ? '🌟 <b>Xuất sắc quá!</b>' : score >= 70 ? '👍 <b>Khá lắm!</b>' : '🙂 <b>Cố lên nào!</b>';
    this.feedback.set(`${head} ${kid} được <b>${score}</b>/100 điểm phát âm!` +
      `<br><span class="heard">Cô nghe được: “${heard || '...'}”</span>` +
      (badParts.length ? `<br>Cần sửa thêm: <b>${badParts.join('</b>, <b>')}</b>` : '') +
      `<br>💬 ${tipVi}`);
    this.tts.speak(`${praise} ${kid} được ${score} trên 100 điểm!`, { lang: 'vi' });
    if (tipVi) this.tts.speakViMixed(tipVi);
    if (pass) {
      this.tts.speak('Bấm nút Từ tiếp theo để học tiếp nhé.', { lang: 'vi' });
    } else {
      this.tts.speak(`${kid} nghe cô đọc mẫu chậm rồi thử lại nhé.`, { lang: 'vi' });
      this.tts.speak(target, { lang: 'en', rate: 0.3 });
    }
  }
  back(): void {
    this.feedback.set('');
    if (this.store.wordIdx() > 0) this.store.wordIdx.update(v => v - 1);
    else { this.store.go(1); void this.router.navigate(['/learn/vocab']); }
  }
  next(): void {
    this.feedback.set('');
    const len = this.store.lesson()?.vocab.length ?? 3;
    if (this.store.wordIdx() >= len - 1) { this.store.go(3); void this.router.navigate(['/learn/story']); }
    else this.store.wordIdx.update(v => v + 1);
  }
}
