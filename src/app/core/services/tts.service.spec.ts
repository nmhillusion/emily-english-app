import { TestBed } from '@angular/core/testing';
import { TtsService } from './tts.service';
describe('TtsService', () => {
  it('exposes speak and stop', () => {
    const s = TestBed.configureTestingModule({}).inject(TtsService);
    expect(typeof s.speak).toBe('function');
    expect(typeof s.stop).toBe('function');
  });
  it('persists per-language voice selection', () => {
    const s = TestBed.configureTestingModule({}).inject(TtsService);
    s.setVoice('en', 'Google US English');
    expect(localStorage.getItem('emily_tts_voice_en')).toBe('Google US English');
    expect(s.getVoice('en')).toBe('Google US English');
    s.setVoice('en', '');
    expect(s.getVoice('en')).toBe('');
    expect(localStorage.getItem('emily_tts_voice_en')).toBeNull();
  });
  it('warmup is safe to call repeatedly without speechSynthesis', () => {
    const s = TestBed.configureTestingModule({}).inject(TtsService);
    expect(() => { s.warmup(); s.warmup(); }).not.toThrow();
    expect(s.talking()).toBe(false);
  });
  it('reloadVoices returns 0 without speechSynthesis and Edge check is sane', () => {
    const s = TestBed.configureTestingModule({}).inject(TtsService);
    expect(s.reloadVoices()).toBe(0);
    expect(typeof s.browserIsEdge()).toBe('boolean');
  });
  it('stop resets talking state without speechSynthesis', () => {
    const s = TestBed.configureTestingModule({}).inject(TtsService);
    s.stop();
    expect(s.talking()).toBe(false);
  });
  it('splits quoted English out of Vietnamese text', () => {
    const s = TestBed.configureTestingModule({}).inject(TtsService);
    expect(s.splitMixed("'Cat' nghĩa là con gì?")).toEqual([
      { text: 'Cat', lang: 'en' },
      { text: ' nghĩa là con gì?', lang: 'vi' }
    ]);
    expect(s.splitMixed('Bé giỏi lắm!')).toEqual([{ text: 'Bé giỏi lắm!', lang: 'vi' }]);
    expect(s.splitMixed('Chưa đúng rồi bé ơi')).toEqual([{ text: 'Chưa đúng rồi bé ơi', lang: 'vi' }]);
  });
  it('never picks a wrong-language voice', () => {
    const s = TestBed.configureTestingModule({}).inject(TtsService);
    const viOnly = [{ name: 'Voice Viet', lang: 'vi-VN', voiceURI: 'v1' } as SpeechSynthesisVoice];
    s.voices$.set(viOnly);
    expect(s.pickVoice('en')).toBeNull();
    expect(s.pickVoice('vi')?.voiceURI).toBe('v1');
    s.setVoice('en', 'v1');
    expect(s.pickVoice('en')).toBeNull();
    s.setVoice('en', '');
  });
});
