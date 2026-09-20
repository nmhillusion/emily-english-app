import { TestBed } from '@angular/core/testing';
import { HistoryService } from './history.service';
import { FALLBACK_LESSON } from '../../shared/models/fallback-lesson';
describe('HistoryService (memory fallback)', () => {
  it('uses memory backend without indexedDB', () => {
    const s = TestBed.configureTestingModule({}).inject(HistoryService);
    expect(s.backend$()).toBe('memory');
  });
  it('isolates word history per subject with a cap', async () => {
    const s = TestBed.configureTestingModule({}).inject(HistoryService);
    const many = Array.from({ length: 35 }, (_, i) => 'Word' + i);
    await s.addUsedWords('Pets', many);
    await s.addUsedWords('Fruits', ['Apple']);
    const got = await s.getUsedWords('pets');
    expect(got.length).toBe(30);
    expect(got).not.toContain('Word0');
    expect(got).toContain('Word34');
    expect(await s.getUsedWords('Fruits')).toEqual(['Apple']);
    await s.clearHistory();
  });
  it('migrates legacy localStorage then deletes it', async () => {
    const s = TestBed.configureTestingModule({}).inject(HistoryService);
    localStorage.setItem('emily_used_words_pets', JSON.stringify(['Old']));
    await s.addUsedWords('Pets', ['New']);
    const got = await s.getUsedWords('Pets');
    expect(got).toContain('Old');
    expect(got).toContain('New');
    expect(localStorage.getItem('emily_used_words_pets')).toBeNull();
    await s.clearHistory();
  });
  it('saves lessons newest-first', async () => {
    const s = TestBed.configureTestingModule({}).inject(HistoryService);
    await s.saveLesson('Pets', FALLBACK_LESSON, 4);
    await s.saveLesson('Fruits', FALLBACK_LESSON, 5);
    const recent = await s.recentLessons(2);
    expect(recent.length).toBe(2);
    expect(recent[0].topic).toBe('Fruits');
    expect(recent[1].topic).toBe('Pets');
    expect(recent[0].score).toBe(5);
    await s.clearHistory();
    expect(await s.recentLessons()).toEqual([]);
  });
});
