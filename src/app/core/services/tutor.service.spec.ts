import { TestBed } from '@angular/core/testing';
import { TutorService } from './tutor.service';
import { SettingsService } from './settings.service';
import { FALLBACK_LESSON } from '../../shared/models/fallback-lesson';
describe('TutorService.quizReview', () => {
  it('returns null without a key', async () => {
    const bed = TestBed.configureTestingModule({});
    bed.inject(SettingsService).setKey('');
    const s = bed.inject(TutorService);
    await expect(s.quizReview(FALLBACK_LESSON.quiz, [1, 0, 1, 0, 1])).resolves.toBeNull();
  });
  it('returns Cô Emily’s review paragraph', async () => {
    const bed = TestBed.configureTestingModule({});
    bed.inject(SettingsService).setKey('TEST-KEY');
    const s = bed.inject(TutorService);
    const origFetch = globalThis.fetch;
    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Bé làm tốt lắm! Ôn lại từ Dog nhé.' }] } }] })
    });
    try {
      const text = await s.quizReview(FALLBACK_LESSON.quiz, [1, 0, 1, 0, 1]);
      expect(text).toContain('Bé làm tốt lắm');
    } finally { (globalThis as any).fetch = origFetch; bed.inject(SettingsService).setKey(''); }
  });
  it('returns null on API failure', async () => {
    const bed = TestBed.configureTestingModule({});
    bed.inject(SettingsService).setKey('TEST-KEY');
    const s = bed.inject(TutorService);
    const origFetch = globalThis.fetch;
    (globalThis as any).fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    try {
      await expect(s.quizReview(FALLBACK_LESSON.quiz, [])).resolves.toBeNull();
    } finally { (globalThis as any).fetch = origFetch; bed.inject(SettingsService).setKey(''); }
  });
});
