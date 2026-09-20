import { TestBed } from '@angular/core/testing';
import { MicService } from './mic.service';
describe('MicService.sim', () => {
  it('measures transcript similarity for the mismatch guard', () => {
    const s = TestBed.configureTestingModule({}).inject(MicService);
    expect(s.sim('Dog', 'dog')).toBe(1);
    expect(s.sim('cat', 'dog')).toBeLessThan(0.4);
  });
});
describe('MicService.describeMicError', () => {
  it('explains blocked permission with the raw code', () => {
    const s = TestBed.configureTestingModule({}).inject(MicService);
    const info = s.describeMicError(new Error('not-allowed'));
    expect(info.html).toContain('Cho phép');
    expect(info.html).toContain('not-allowed');
  });
  it('explains silence distinctly from permission', () => {
    const s = TestBed.configureTestingModule({}).inject(MicService);
    const info = s.describeMicError(new Error('no-speech'));
    expect(info.html).toContain('chưa nghe thấy');
    expect(info.html).not.toContain('Cho phép');
  });
  it('shows raw code for unknown errors', () => {
    const s = TestBed.configureTestingModule({}).inject(MicService);
    const info = s.describeMicError(new Error('weird-code-123'));
    expect(info.html).toContain('weird-code-123');
  });
});
describe('MicService.listenOnce lifecycle', () => {
  class FakeRec {
    static instances: FakeRec[] = [];
    onresult: any = null; onerror: any = null; onend: any = null;
    onstart: any = null; onsoundstart: any = null; onspeechstart: any = null;
    lang = ''; interimResults = false; maxAlternatives = 1;
    constructor() { FakeRec.instances.push(this); }
    start(): void { if (this.onstart) this.onstart(); }
    stop(): void { /* noop */ }
    abort(): void { if (this.onerror) this.onerror({ error: 'aborted' }); }
  }
  let orig: any;
  beforeEach(() => {
    FakeRec.instances = [];
    orig = (window as any).SpeechRecognition;
    (window as any).SpeechRecognition = FakeRec;
  });
  afterEach(() => { (window as any).SpeechRecognition = orig; });
  const resultEvent = (texts: string[]) => ({
    results: [{ length: texts.length, ...Object.fromEntries(texts.map((t, i) => [i, { transcript: t }])) , }]
  });

  it('resolves a result arriving after onend (late-result grace)', async () => {
    const s = TestBed.configureTestingModule({}).inject(MicService);
    const p = s.listenOnce(50);
    const rec = FakeRec.instances[0];
    rec.onend();
    rec.onresult(resultEvent(['dog']));
    await expect(p).resolves.toEqual(['dog']);
  });
  it('rejects nospeech when onend arrives with no sound', async () => {
    const s = TestBed.configureTestingModule({}).inject(MicService);
    const p = s.listenOnce(5);
    FakeRec.instances[0].onend();
    await expect(p).rejects.toThrow('nospeech');
  });
  it('rejects unclear when sound was heard but no transcript', async () => {
    const s = TestBed.configureTestingModule({}).inject(MicService);
    const p = s.listenOnce(5);
    const rec = FakeRec.instances[0];
    if (rec.onsoundstart) rec.onsoundstart();
    rec.onend();
    await expect(p).rejects.toThrow('unclear');
  });
});
