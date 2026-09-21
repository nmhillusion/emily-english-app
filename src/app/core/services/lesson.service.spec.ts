import { TestBed } from '@angular/core/testing';
import { LessonService } from './lesson.service';
import { SettingsService } from './settings.service';
import { FALLBACK_LESSON } from '../../shared/models/fallback-lesson';
describe('LessonService.normalize', () => {
  it('rejects vocab != 3', () => {
    const s = TestBed.configureTestingModule({}).inject(LessonService);
    expect(s.normalizeLesson({ vocab: [], story: {}, quiz: [] }, 'X')).toBeNull();
  });
  it('accepts fallback-shaped raw', () => {
    const s = TestBed.configureTestingModule({}).inject(LessonService);
    const raw = JSON.parse(JSON.stringify({ ...FALLBACK_LESSON }));
    const lesson = s.normalizeLesson(raw, 'Vật nuôi');
    expect(lesson?.vocab.length).toBe(3);
    expect(lesson?.vocab[0].tip).toContain('miệng');
  });
  it('preserves aboutStory flags', () => {
    const s = TestBed.configureTestingModule({}).inject(LessonService);
    const raw = JSON.parse(JSON.stringify({ ...FALLBACK_LESSON }));
    const lesson = s.normalizeLesson(raw, 'Vật nuôi');
    expect(lesson?.quiz.filter(q => q.aboutStory).length).toBe(3);
    expect(lesson?.quiz.filter(q => !q.aboutStory).length).toBe(2);
  });
  it('defaults missing aboutStory to false', () => {
    const s = TestBed.configureTestingModule({}).inject(LessonService);
    const raw = JSON.parse(JSON.stringify({ ...FALLBACK_LESSON }));
    delete raw.quiz[1].aboutStory;
    const lesson = s.normalizeLesson(raw, 'Vật nuôi');
    expect(lesson?.quiz[1].aboutStory).toBe(false);
  });
  it('asks AI to flag story questions', () => {
    const s = TestBed.configureTestingModule({}).inject(LessonService);
    expect(s.buildPrompt('Pets')).toContain('aboutStory');
  });
  it('keeps vocab tips and defaults missing tip to empty', () => {
    const s = TestBed.configureTestingModule({}).inject(LessonService);
    const raw = JSON.parse(JSON.stringify({ ...FALLBACK_LESSON }));
    delete raw.vocab[1].tip;
    const lesson = s.normalizeLesson(raw, 'Vật nuôi');
    expect(lesson?.vocab[0].tip).toContain('miệng');
    expect(lesson?.vocab[1].tip).toBe('');
  });
  it('builds URL from configured model, not a pinned version', () => {
    const s = TestBed.configureTestingModule({}).inject(LessonService);
    expect(s.buildUrl()).toContain('gemini-flash-lite-latest');
    expect(s.buildUrl()).not.toContain('gemini-2.0-flash');
  });
  it('includes the avoid list in the prompt', () => {
    const s = TestBed.configureTestingModule({}).inject(LessonService);
    const p = s.buildPrompt('Pets', ['Dog', 'Cat']);
    expect(p).toContain('Dog');
    expect(p).toContain('Cat');
    expect(s.buildPrompt('Pets')).not.toContain('Tránh dùng lại');
  });
  it('addresses the student by name in the prompt', () => {
    const bed = TestBed.configureTestingModule({});
    bed.inject(SettingsService).setKidName('Minh Anh');
    const s = bed.inject(LessonService);
    expect(s.buildPrompt('Pets')).toContain('Minh Anh');
    bed.inject(SettingsService).setKidName('');
  });
  it('requires rich sentence notes (meaning + structure + fluency)', () => {
    const s = TestBed.configureTestingModule({}).inject(LessonService);
    const p = s.buildPrompt('Pets');
    expect(p).toContain('lưu loát');
    expect(p).toContain('nghĩa tiếng Việt của cả câu');
  });
  it('lists only generateContent models, flash-lite first', async () => {
    const bed = TestBed.configureTestingModule({});
    const s = bed.inject(LessonService);
    const settings = bed.inject(SettingsService);
    settings.setKey('TEST-KEY');
    const origFetch = globalThis.fetch;
    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({ models: [
        { name: 'models/gemini-3.5-pro', displayName: 'Gemini 3.5 Pro', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-3.5-flash', displayName: 'Gemini 3.5 Flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-embedding-001', displayName: 'Embedding', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemini-3.5-flash-lite', displayName: 'Gemini 3.5 Flash-Lite', supportedGenerationMethods: ['generateContent'] }
      ] })
    });
    try {
      const opts = await s.listModels(true);
      expect(opts.map(o => o.id)).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.5-pro']);
    } finally { (globalThis as any).fetch = origFetch; }
  });
});
