import { TestBed } from '@angular/core/testing';
import { PronunciationService } from './pronunciation.service';
import { SettingsService } from './settings.service';
describe('PronunciationService prompt+parse', () => {
  it('builds a prompt containing target and phonetics', () => {
    const s = TestBed.configureTestingModule({}).inject(PronunciationService);
    const p = s.buildAssessmentPrompt('Rabbit', '/ˈræb.ɪt/');
    expect(p).toContain('Rabbit');
    expect(p).toContain('/ˈræb.ɪt/');
    expect(p).toContain('tip_vi');
    expect(p).toContain('dưới 30');
    expect(p).toContain('không sửa thành từ mục tiêu');
  });
  it('parses a valid assessment', () => {
    const s = TestBed.configureTestingModule({}).inject(PronunciationService);
    const a = s.parseAssessment(JSON.stringify({
      score: 82, heard: 'rabbit', bad_parts: ['r'], tip_vi: 'Bé cong lưỡi khi đọc âm r nhé!', pass: true
    }));
    expect(a?.score).toBe(82);
    expect(a?.pass).toBe(true);
    expect(a?.badParts).toEqual(['r']);
  });
  it('rejects malformed assessment JSON', () => {
    const s = TestBed.configureTestingModule({}).inject(PronunciationService);
    expect(s.parseAssessment('not json')).toBeNull();
    expect(s.parseAssessment(JSON.stringify({ score: 150, heard: 'x', bad_parts: [], tip_vi: '' }))).toBeNull();
    expect(s.parseAssessment(JSON.stringify({ heard: 'x', bad_parts: [], tip_vi: 'ok' }))).toBeNull();
  });
});
describe('PronunciationService.assessAudio', () => {
  it('returns null without a key', async () => {
    const bed = TestBed.configureTestingModule({});
    bed.inject(SettingsService).setKey('');
    const s = bed.inject(PronunciationService);
    await expect(s.assessAudio(new Blob(['x']), 'Dog', '/dɒɡ/')).resolves.toBeNull();
  });
  it('maps a good Gemini response to an assessment', async () => {
    const bed = TestBed.configureTestingModule({});
    bed.inject(SettingsService).setKey('TEST-KEY');
    const s = bed.inject(PronunciationService);
    const origFetch = globalThis.fetch;
    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        score: 65, heard: 'dog', bad_parts: ['o'], tip_vi: 'Bé mở miệng tròn khi đọc âm o nhé!', pass: false }) }] } }] })
    });
    try {
      const a = await s.assessAudio(new Blob(['fake-audio']), 'Dog', '/dɒɡ/');
      expect(a?.score).toBe(65);
      expect(a?.pass).toBe(false);
      expect(a?.tipVi).toContain('miệng tròn');
    } finally { (globalThis as any).fetch = origFetch; bed.inject(SettingsService).setKey(''); }
  });
  it('returns null on API failure', async () => {
    const bed = TestBed.configureTestingModule({});
    bed.inject(SettingsService).setKey('TEST-KEY');
    const s = bed.inject(PronunciationService);
    const origFetch = globalThis.fetch;
    (globalThis as any).fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    try {
      await expect(s.assessAudio(new Blob(['x']), 'Dog', '')).resolves.toBeNull();
      expect(s.assessIssue$()).toBe('');
    } finally { (globalThis as any).fetch = origFetch; bed.inject(SettingsService).setKey(''); }
  });
  it('flags model-audio when the model rejects audio input', async () => {
    const bed = TestBed.configureTestingModule({});
    bed.inject(SettingsService).setKey('TEST-KEY');
    const s = bed.inject(PronunciationService);
    const origFetch = globalThis.fetch;
    (globalThis as any).fetch = async () => ({
      ok: false, status: 400,
      json: async () => ({ error: { message: 'Multimodal input (audio) is not supported for this model' } })
    });
    try {
      await expect(s.assessAudio(new Blob(['x']), 'Dog', '')).resolves.toBeNull();
      expect(s.assessIssue$()).toBe('model-audio');
    } finally { (globalThis as any).fetch = origFetch; bed.inject(SettingsService).setKey(''); }
  });
  it('caps an inflated score for a clearly wrong word', async () => {
    const bed = TestBed.configureTestingModule({});
    bed.inject(SettingsService).setKey('TEST-KEY');
    const s = bed.inject(PronunciationService);
    const origFetch = globalThis.fetch;
    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        score: 90, heard: 'cat', bad_parts: [], tip_vi: 'Bé giỏi lắm, cố lên nhé!', pass: true }) }] } }] })
    });
    try {
      const a = await s.assessAudio(new Blob(['x']), 'Dog', '/dɒɡ/');
      expect(a?.score).toBeLessThanOrEqual(45);
      expect(a?.pass).toBe(false);
    } finally { (globalThis as any).fetch = origFetch; bed.inject(SettingsService).setKey(''); }
  });
  it('caps via the independent audit ear even when heard echoes the target', async () => {
    const bed = TestBed.configureTestingModule({});
    bed.inject(SettingsService).setKey('TEST-KEY');
    const s = bed.inject(PronunciationService);
    const origFetch = globalThis.fetch;
    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        score: 90, heard: 'yellow', bad_parts: [], tip_vi: 'Tuyệt vời!', pass: true }) }] } }] })
    });
    try {
      const a = await s.assessAudio(new Blob(['x']), 'Yellow', '', 'orange');
      expect(a?.score).toBeLessThanOrEqual(45);
      expect(a?.pass).toBe(false);
      expect(a?.tipVi).toContain('nghe mẫu chậm');
    } finally { (globalThis as any).fetch = origFetch; bed.inject(SettingsService).setKey(''); }
  });
  it('leaves honest scores alone with matching or empty audit', async () => {
    const bed = TestBed.configureTestingModule({});
    bed.inject(SettingsService).setKey('TEST-KEY');
    const s = bed.inject(PronunciationService);
    const origFetch = globalThis.fetch;
    const good = JSON.stringify({ score: 82, heard: 'yellow', bad_parts: [], tip_vi: 'Hay lắm!', pass: true });
    (globalThis as any).fetch = async () => ({
      ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: good }] } }] })
    });
    try {
      expect((await s.assessAudio(new Blob(['x']), 'Yellow', '', 'yellow'))?.score).toBe(82);
      expect((await s.assessAudio(new Blob(['x']), 'Yellow', '', ''))?.score).toBe(82);
    } finally { (globalThis as any).fetch = origFetch; bed.inject(SettingsService).setKey(''); }
  });
});
