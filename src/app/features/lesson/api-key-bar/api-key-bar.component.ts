import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../core/services/settings.service';
import { LessonService } from '../../../core/services/lesson.service';
import { TtsService } from '../../../core/services/tts.service';
@Component({
  selector: 'app-api-key-bar',
  standalone: true,
  imports: [FormsModule],
  template: `<div class="row" style="justify-content:flex-end;margin-bottom:10px">
    <button class="btn ghost" (click)="toggle()" aria-label="Cài đặt">⚙️</button>
  </div>
  @if (open()) {
  <div class="card flat">
  <label class="muted" for="kidName">Tên của em</label>
  <input id="kidName" type="text" [ngModel]="settings.getKidName()" (ngModelChange)="settings.setKidName($event)" placeholder="Ví dụ: Minh Anh" aria-label="Tên của em" style="margin-top:4px">
  @if (!hasKey()) {
    <div class="muted" style="margin-top:10px">Dùng key của bạn — miễn phí, key chỉ lưu trên máy này:
      <br>1. Bấm <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> → Create API key
      <br>2. Copy key, dán vào ô dưới
      <br>3. Bấm Lưu key
    </div>
  }
  <div class="row" style="margin-top:10px">
    <input [type]="showKey$() ? 'text' : 'password'" [(ngModel)]="draft" placeholder="Dán Gemini API key của bạn" aria-label="Gemini API key" style="flex:1">
    <button class="btn ghost" (click)="toggleShowKey()" [attr.aria-label]="showKey$() ? 'Ẩn key' : 'Hiện key'">{{ showKey$() ? '🙈' : '👁️' }}</button>
  </div>
  @if (lessons.modelOptions$().length) {
    <select [(ngModel)]="modelDraft" (ngModelChange)="pickModel($event)" aria-label="Chọn model" style="margin-top:10px">
      @for (o of lessons.modelOptions$(); track o.id) { <option [value]="o.id">{{ o.displayName }} ({{ o.id }})</option> }
    </select>
  }
  <div class="row" style="margin-top:10px">
    <button class="btn" (click)="save()" [disabled]="!draft.trim()">Lưu key</button>
    @if (hasKey()) { <button class="btn ghost" (click)="reload()" [disabled]="lessons.modelsLoading$()">🔄 Tải danh sách model</button> }
    @if (hasKey()) { <button class="btn ghost" (click)="remove()">Xóa key</button> }
  </div>
  @if (lessons.modelsLoading$()) { <p class="muted">Cô đang kiểm tra key...</p> }
  @if (lessons.modelsError$()) { <p class="muted">{{ lessons.modelsError$() }}</p> }
  @if (saved$()) { <p class="muted">Đã lưu key — chúc {{ settings.kidOr() }} học vui nhé!</p> }
  @if (!hasKey()) { <p class="muted">Chưa có key — dán key của bạn để Cô soạn bài và chấm phát âm cho {{ settings.kidOr() }} nhé.</p> }
  @if (hasKey()) { <p class="muted">Đang dùng key của bạn, lưu trên máy này.</p> }
  <div style="margin-top:12px">
    <label class="muted" for="voiceEn">Giọng đọc tiếng Anh</label>
    <select id="voiceEn" [ngModel]="tts.getVoice('en')" (ngModelChange)="pickVoice('en', $event)" aria-label="Giọng đọc tiếng Anh" style="margin-top:4px">
      <option value="">Tự động (giọng nữ)</option>
      @for (v of tts.voicesFor('en'); track v.voiceURI) { <option [value]="v.voiceURI">{{ v.name }} ({{ v.lang }})</option> }
    </select>
    <div class="row" style="margin-top:6px"><button class="btn ghost" (click)="previewVoice('en')">🔊 Nghe thử giọng Anh</button></div>
  </div>
  <div style="margin-top:12px">
    <label class="muted" for="voiceVi">Giọng đọc tiếng Việt</label>
    <select id="voiceVi" [ngModel]="tts.getVoice('vi')" (ngModelChange)="pickVoice('vi', $event)" aria-label="Giọng đọc tiếng Việt" style="margin-top:4px">
      <option value="">Tự động (giọng nữ)</option>
      @for (v of tts.voicesFor('vi'); track v.voiceURI) { <option [value]="v.voiceURI">{{ v.name }} ({{ v.lang }})</option> }
    </select>
    <div class="row" style="margin-top:6px"><button class="btn ghost" (click)="previewVoice('vi')">🔊 Nghe thử giọng Việt</button></div>
  </div>
  <div class="row" style="margin-top:12px"><button class="btn ghost" (click)="reloadVoices()">🔄 Tải lại giọng đọc ({{ tts.voices$().length }})</button></div>
  @if (tts.browserIsEdge() && !tts.voices$().length) {
    <p class="muted">Trên Edge, danh sách giọng chỉ hiện sau khi bấm <b>Read Aloud</b> trên thanh công cụ một lần, rồi bấm <b>Tải lại giọng đọc</b> nhé. Bài học vẫn đọc bình thường bằng giọng mặc định.</p>
  }</div>
  }`
})
export class ApiKeyBarComponent implements OnInit {
  settings = inject(SettingsService);
  lessons = inject(LessonService);
  tts = inject(TtsService);
  draft = '';
  modelDraft = '';
  open = signal(false);
  showKey$ = signal(false);
  saved$ = signal(false);
  constructor() { this.modelDraft = this.settings.getModel(); }
  ngOnInit(): void {
    this.open.set(!this.hasKey());
    if (this.hasKey()) void this.lessons.listModels();
  }
  hasKey = () => this.settings.getKey().length > 0;
  toggle(): void { this.open.update(v => !v); this.saved$.set(false); }
  toggleShowKey(): void { this.showKey$.update(v => !v); }
  pickModel(m: string): void { this.modelDraft = m; this.settings.setModel(m); }
  pickVoice(lang: 'en' | 'vi', uri: string): void { this.tts.setVoice(lang, uri); }
  previewVoice(lang: 'en' | 'vi'): void {
    const kid = this.settings.kidOr();
    this.tts.speak(lang === 'en' ? 'Hello! I am Teacher Emily.' : `Xin chào ${kid}! Cô là Cô Emily đây.`, { lang, rate: 0.9 });
  }
  save(): void {
    if (!this.draft.trim()) return;
    this.saved$.set(false);
    this.settings.setKey(this.draft);
    this.settings.setModel(this.modelDraft);
    this.draft = '';
    if (this.hasKey()) {
      void this.lessons.listModels(true).then(() => {
        if (!this.lessons.modelsError$()) {
          this.saved$.set(true);
          this.open.set(false);
        }
      });
    }
  }
  remove(): void {
    this.settings.clearKey();
    this.lessons.modelOptions$.set([]);
    this.saved$.set(false);
    this.draft = '';
    this.open.set(true);
  }
  reload(): void { void this.lessons.listModels(true); }
  reloadVoices(): void { this.tts.reloadVoices(); }
}
