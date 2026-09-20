import { Injectable, inject, signal } from '@angular/core';
import { Lesson } from '../../shared/models/lesson';
import { SettingsService } from './settings.service';
import { HistoryService } from './history.service';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export interface ModelOption { id: string; displayName: string; }
@Injectable({ providedIn: 'root' })
export class LessonService {
  private settings = inject(SettingsService);
  private history = inject(HistoryService);
  readonly modelOptions$ = signal<ModelOption[]>([]);
  readonly modelsLoading$ = signal(false);
  readonly modelsError$ = signal('');
  buildUrl(): string {
    return `${API_BASE}/${encodeURIComponent(this.settings.getModel())}:generateContent`;
  }
  async listModels(force = false): Promise<ModelOption[]> {
    if (!force && this.modelOptions$().length) return this.modelOptions$();
    const key = this.settings.getKey();
    if (!key) { this.modelsError$.set(`${this.settings.kidOr()} dán API key rồi bấm Lưu key để cô tải danh sách model nhé.`); return []; }
    this.modelsLoading$.set(true);
    this.modelsError$.set('');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${API_BASE}?key=${encodeURIComponent(key)}&pageSize=100`, { signal: ctrl.signal });
      if (!res.ok) {
        this.modelsError$.set(res.status === 400 || res.status === 403
          ? `Key chưa đúng rồi. ${this.settings.kidOr()} kiểm tra lại key giúp cô nhé.`
          : `Cô chưa tải được danh sách (lỗi ${res.status}). Bấm nút tải lại thử nhé.`);
        return [];
      }
      const data = await res.json();
      const rank = (id: string) => id.includes('flash-lite') ? 0 : id.includes('flash') ? 1 : 2;
      const opts: ModelOption[] = (data?.models ?? [])
        .filter((m: any) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => ({ id: String(m.name ?? '').replace(/^models\//, ''), displayName: String(m.displayName ?? m.name ?? '') }))
        .filter((o: ModelOption) => !!o.id)
        .sort((a: ModelOption, b: ModelOption) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
      this.modelOptions$.set(opts);
      if (!opts.length) this.modelsError$.set('Cô không thấy model nào dùng được. Bấm nút tải lại thử nhé.');
      return opts;
    } catch {
      this.modelsError$.set('Mạng hơi yếu, cô chưa tải được danh sách. Bấm nút tải lại thử nhé.');
      return [];
    } finally { clearTimeout(t); this.modelsLoading$.set(false); }
  }
  buildPrompt(topic: string, avoid: string[] = []): string {
    const kid = this.settings.getKidName();
    const addr = kid ? ` Học sinh tên là "${kid}" — gọi em bằng tên, không dùng từ "bé".` : '';
    const lines = ['Bạn là Cô Emily, gia sư tiếng Anh cho học sinh tiểu học Việt Nam (6–11 tuổi).' + addr,
      `Hãy soạn một bài học tiếng Anh cho chủ đề: "${topic}".`,
      'Chỉ trả về JSON đúng cấu trúc {topic_emoji, vocab[3]{word,phonetics,meaning,emoji,tip}, story{title,full_english,full_vietnamese,english[],vietnamese[],notes[]}, quiz[5]{question,options[3],correct,hint,explanation}}.',
      'Quy tắc: vocab đúng 3 từ cơ bản; tip là 1 câu tiếng Việt dưới 20 từ hướng dẫn học sinh cách đặt miệng/lưỡi để đọc đúng từ đó; story 3-5 câu đơn giản thì hiện tại; english/vietnamese/notes có số phần tử bằng nhau; mỗi notes gồm 3 phần súc tích cho trẻ: nghĩa tiếng Việt của cả câu, 1 điểm cấu trúc mini, 1 mẹo đọc lưu loát cụ thể (nối âm/nhấn từ nào/ngắt nghỉ ở đâu); quiz đúng 5 câu mỗi câu 3 lựa chọn; giọng dịu dàng của cô giáo gọi học sinh bằng tên; mọi từ/cụm tiếng Anh trong notes/question/hint/explanation luôn đặt trong dấu nháy đơn \'...\'.',
      `Quan trọng: mỗi lần soạn bài PHẢI chọn 3 từ vựng KHÁC với các lần trước cho cùng chủ đề, sao cho ${kid || 'bé'} học được từ mới mỗi buổi.`];
    const ban = avoid.map(w => String(w).trim()).filter(Boolean).slice(-12);
    if (ban.length) lines.push(`Tránh dùng lại các từ sau (${kid || 'bé'} đã học rồi): ${ban.join(', ')}.`);
    return lines.join('\n');
  }
  normalizeLesson(raw: any, topic: string): Lesson | null {
    try {
      const v = (raw?.vocab ?? []).slice(0, 3).map((x: any) => ({
        word: String(x.word ?? '').trim(), phonetics: String(x.phonetics ?? ''),
        meaning: String(x.meaning ?? ''), emoji: String(x.emoji ?? '✨'),
        tip: String(x.tip ?? '').trim() }));
      if (v.length !== 3 || !v.every((x: any) => x.word)) return null;
      let en: string[] = (raw?.story?.english ?? []).map((s: any) => String(s).trim()).filter(Boolean);
      if (!en.length && raw?.story?.full_english) en = String(raw.story.full_english).match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()) ?? [];
      if (en.length < 2) return null;
      let vi: string[] = (raw?.story?.vietnamese ?? []).map((s: any) => String(s));
      let nt: string[] = (raw?.story?.notes ?? []).map((s: any) => String(s));
      while (vi.length < en.length) vi.push('');
      while (nt.length < en.length) nt.push('');
      const quiz = (raw?.quiz ?? []).filter((q: any) => q?.question && Array.isArray(q.options))
        .slice(0, 5).map((q: any) => ({ question: String(q.question),
          options: [String(q.options[0]), String(q.options[1]), String(q.options[2])] as [string,string,string],
          correct: (q.correct === 0 || q.correct === 1 || q.correct === 2) ? q.correct : 0,
          hint: String(q.hint ?? 'Đọc kỹ lại câu chuyện một lần nữa nhé!'), explanation: String(q.explanation ?? '') }));
      if (quiz.length < 3) return null;
      return { topic_emoji: String(raw.topic_emoji ?? '✨'), vocab: v as Lesson['vocab'],
        story: { title: String(raw.story?.title ?? topic),
          full_english: String(raw.story?.full_english ?? en.join(' ')),
          full_vietnamese: String(raw.story?.full_vietnamese ?? vi.join(' ')),
          english: en, vietnamese: vi.slice(0, en.length), notes: nt.slice(0, en.length) }, quiz: quiz as Lesson['quiz'] };
    } catch { return null; }
  }
  /** Gemini is mandatory: throws 'no-key' or 'lesson-failed', never a fallback. */
  async generate(topic: string): Promise<Lesson> {
    const key = this.settings.getKey();
    if (!key) throw new Error('no-key');
    const avoid = await this.history.getUsedWords(topic);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${this.buildUrl()}?key=${encodeURIComponent(key)}`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: this.buildPrompt(topic, avoid) }] }],
          generationConfig: { responseMimeType: 'application/json' } })
      });
      if (!res.ok) throw new Error('lesson-failed');
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const lesson = this.normalizeLesson(JSON.parse(text), topic);
      if (!lesson) throw new Error('lesson-failed');
      await this.history.addUsedWords(topic, lesson.vocab.map(v => v.word));
      await this.history.saveLesson(topic, lesson);
      return lesson;
    } catch (e) {
      if (e instanceof Error && (e.message === 'no-key' || e.message === 'lesson-failed')) throw e;
      throw new Error('lesson-failed');
    }
    finally { clearTimeout(t); }
  }
}
