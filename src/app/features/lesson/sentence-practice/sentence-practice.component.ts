import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressStore } from '../../../core/services/progress.store';
import { TtsService } from '../../../core/services/tts.service';
import { MicService } from '../../../core/services/mic.service';
import { PronunciationService } from '../../../core/services/pronunciation.service';
import { SettingsService } from '../../../core/services/settings.service';
@Component({
  selector: 'app-sentence-practice',
  standalone: true,
  template: `@if (store.lesson(); as lesson) {
    @if (lesson.story.english[store.sentIdx()]; as en) {
      <div class="bubble">Câu <b>{{ store.sentIdx() + 1 }}</b> trong <b>{{ lesson.story.english.length }}</b> — mình đọc chậm rãi nha {{ settings.kidOr() }}!</div>
      <div class="row" style="margin-bottom:10px"><button class="btn ghost" (click)="guide()">🔊 Cô hướng dẫn lại</button></div>
      <div class="card">
      <div class="sent">{{ en }}</div>
      <div class="sentvi">{{ lesson.story.vietnamese[store.sentIdx()] }}</div>
      @if (lesson.story.notes[store.sentIdx()]) { <div class="note">💡 {{ lesson.story.notes[store.sentIdx()] }}</div> }
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
      <div class="row"><button class="btn ghost" (click)="back()">← Câu trước</button>
      <button class="btn go" style="flex:1;justify-content:center" (click)="next()">Câu tiếp theo →</button></div>
    }
  }`
})
export class SentencePracticeComponent {
  store = inject(ProgressStore);
  private router = inject(Router);
  private tts = inject(TtsService);
  private mic = inject(MicService);
  pron = inject(PronunciationService);
  settings = inject(SettingsService);
  feedback = signal('');
  fbCls = signal<'good' | 'ok' | 'retry'>('ok');
  recording = signal(false);
  audioOn = signal(false);
  constructor() {
    effect(() => { this.store.sentIdx(); this.store.lesson(); this.guide(); });
  }
  guide(): void {
    const i = this.store.sentIdx();
    const st = this.store.lesson()?.story;
    const en = st?.english[i];
    if (!en) return;
    const lead = st.notes[i] || `Câu thứ ${i + 1}. ${this.settings.kidOr()} nghe cô đọc nhé.`;
    this.tts.speakViMixed(lead);
    this.tts.speak(en, { lang: 'en', rate: 0.9 });
  }
  hear(rate: 0.9 | 0.3): void {
    const en = this.store.lesson()?.story.english[this.store.sentIdx()];
    if (en) this.tts.speak(en, { lang: 'en', rate });
  }
  canMic(): boolean {
    return this.pron.audioReady();
  }
  async doMic(): Promise<void> {
    const en = this.store.lesson()?.story.english[this.store.sentIdx()];
    if (!en || this.recording() || this.pron.phase$() === 'analyzing') return;
    this.tts.stop();
    if (this.audioOn()) { this.pron.requestStop(); return; }
    if (!this.pron.audioReady()) {
      this.fbCls.set('retry');
      this.feedback.set(`🔑 <b>Cần API key để Cô chấm phát âm.</b> ${this.settings.kidOr()} mở ⚙️ dán key rồi thử lại nhé.`);
      return;
    }
    await this.doAudio(en, 9000);
  }
  private async doAudio(target: string, maxMs: number): Promise<void> {
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
      const a = await this.pron.assessAudio(blob, target, '', audit);
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
      this.tts.speak('Bấm nút Câu tiếp theo để học tiếp nhé.', { lang: 'vi' });
    } else {
      this.tts.speak(`${kid} nghe cô đọc mẫu chậm rồi thử lại nhé.`, { lang: 'vi' });
      this.tts.speak(target, { lang: 'en', rate: 0.3 });
    }
  }
  back(): void {
    this.feedback.set('');
    if (this.store.sentIdx() > 0) this.store.sentIdx.update(v => v - 1);
    else { this.store.go(3); void this.router.navigate(['/learn/story']); }
  }
  next(): void {
    this.feedback.set('');
    const len = this.store.lesson()?.story.english.length ?? 1;
    if (this.store.sentIdx() >= len - 1) { this.store.qIdx.set(0); this.store.answers.set([]); this.store.go(5); void this.router.navigate(['/learn/quiz']); }
    else this.store.sentIdx.update(v => v + 1);
  }
}
