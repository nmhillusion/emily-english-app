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
  <input type="password" [(ngModel)]="draft" placeholder="Dán Gemini API key" aria-label="Gemini API key" style="margin-top:10px">
  @if (lessons.modelOptions$().length) {
    <select [(ngModel)]="modelDraft" (ngModelChange)="pickModel($event)" aria-label="Chọn model" style="margin-top:10px">
      @for (o of lessons.modelOptions$(); track o.id) { <option [value]="o.id">{{ o.displayName }} ({{ o.id }})</option> }
    </select>
  }
  <div class="row" style="margin-top:10px">
    <button class="btn" (click)="save()">Lưu key</button>
    @if (hasKey()) { <button class="btn ghost" (click)="reload()" [disabled]="lessons.modelsLoading$()">🔄 Tải danh sách model</button> }
  </div>
  @if (lessons.modelsLoading$()) { <p class="muted">Cô đang tải danh sách model...</p> }
  @if (lessons.modelsError$()) { <p class="muted">{{ lessons.modelsError$() }}</p> }
  @if (!hasKey()) { <p class="muted">Chưa có key — dán key để Cô soạn bài và chấm phát âm cho {{ settings.kidOr() }} nhé.</p> }
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
  constructor() { this.modelDraft = this.settings.getModel(); }
  ngOnInit(): void {
    this.open.set(!this.hasKey());
    if (this.hasKey()) void this.lessons.listModels();
  }
  hasKey = () => this.settings.getKey().length > 0;
  toggle(): void { this.open.update(v => !v); }
  pickModel(m: string): void { this.modelDraft = m; this.settings.setModel(m); }
  pickVoice(lang: 'en' | 'vi', uri: string): void { this.tts.setVoice(lang, uri); }
  previewVoice(lang: 'en' | 'vi'): void {
    const kid = this.settings.kidOr();
    this.tts.speak(lang === 'en' ? 'Hello! I am Teacher Emily.' : `Xin chào ${kid}! Cô là Cô Emily đây.`, { lang, rate: 0.9 });
  }
  save(): void {
    this.settings.setKey(this.draft);
    this.settings.setModel(this.modelDraft);
    this.draft = '';
    if (this.hasKey()) void this.lessons.listModels(true);
  }
  reload(): void { void this.lessons.listModels(true); }
  reloadVoices(): void { this.tts.reloadVoices(); }
}
