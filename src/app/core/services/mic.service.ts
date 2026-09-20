import { Injectable, inject, signal } from '@angular/core';
import { SettingsService } from './settings.service';
export interface MicErrorInfo { html: string; say: string; }
const norm = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j); let cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) { cur[0] = i;
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    [prev, cur] = [cur, prev]; }
  return prev[n];
}
@Injectable({ providedIn: 'root' })
export class MicService {
  private settings = inject(SettingsService);
  private kid(): string { return this.settings.kidOr(); }
  /** True once the recognizer actually started (mic live), false otherwise. */
  readonly listening$ = signal(false);
  /** True if sound was detected during the current session. */
  readonly heardSound$ = signal(false);
  private current: any = null;
  isSupported(): boolean {
    return typeof (window as any).SpeechRecognition !== 'undefined' ||
      typeof (window as any).webkitSpeechRecognition !== 'undefined';
  }
  sim(a: string, b: string): number {
    a = norm(a); b = norm(b);
    if (!a && !b) return 1;
    return 1 - lev(a, b) / Math.max(a.length, b.length, 1);
  }
  describeMicError(e: unknown): MicErrorInfo {
    const code = e instanceof Error ? (e.message || 'mic-error') : String(e ?? 'mic-error');
    const kid = this.kid();
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return { html: `🔒 <b>Trình duyệt chưa cho phép dùng micro.</b> ${kid} nhờ ba mẹ bấm vào biểu tượng ổ khóa/kính lúp trên thanh địa chỉ → Quyền (Permissions) → Micro → <b>Cho phép</b>, rồi tải lại trang nhé.<br><small>Mã lỗi: ${code}</small>`,
          say: `Trình duyệt chưa cho phép dùng micro. ${kid} nhờ ba mẹ cho phép giúp nhé.` };
      case 'no-speech':
      case 'nospeech':
        return { html: `💗 <b>Cô chưa nghe thấy tiếng ${kid}.</b> ${kid} bấm micro, đợi cô hiện "đang nghe" rồi hãy đọc to, rõ từng tiếng nhé!<br><small>Mã lỗi: ${code}</small>`,
          say: `Cô chưa nghe thấy tiếng ${kid}. Đợi cô sẵn sàng rồi đọc to lên nha!` };
      case 'unclear':
        return { html: `👂 <b>Cô có nghe thấy tiếng ${kid} nhưng chưa rõ lời.</b> ${kid} đọc chậm hơn, to hơn, giữ điện thoại gần miệng rồi thử lại nhé!<br><small>Mã lỗi: unclear</small>`,
          say: `Cô có nghe tiếng nhưng chưa rõ. ${kid} đọc chậm và to hơn nhé.` };
      case 'network':
        return { html: `📶 <b>Mạng hơi yếu nên cô chưa nghe được.</b> ${kid} kiểm tra wifi/4G rồi thử lại nhé.<br><small>Mã lỗi: network</small>`,
          say: `Mạng hơi yếu, ${kid} thử lại nhé.` };
      case 'aborted':
        return { html: `${kid} bấm dừng rồi. Bấm micro để đọc lại nhé.<br><small>Mã lỗi: aborted</small>`,
          say: `${kid} bấm micro để đọc lại nhé.` };
      case 'unsupported':
        return { html: `🎤 <b>Trình duyệt này chưa hỗ trợ micro.</b> ${kid} mở bằng <b>Chrome</b> trên Android hoặc máy tính nhé.<br><small>Mã lỗi: unsupported</small>`,
          say: 'Trình duyệt này chưa hỗ trợ micro.' };
      default:
        return { html: `💗 <b>Micro gặp sự cố.</b> ${kid} tải lại trang rồi thử lại nhé.<br><small>Mã lỗi: ${code}</small>`,
          say: `Micro gặp sự cố, ${kid} thử lại nhé.` };
    }
  }
  listenOnce(graceMs = 800): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!Ctor) { reject(new Error('unsupported')); return; }
      try { if (this.current) this.current.abort(); } catch { /* ignore */ }
      const rec = new Ctor();
      this.current = rec;
      rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 3;
      let gotResult: string[] | null = null;
      let heardSound = false;
      let lastError = '';
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        this.listening$.set(false);
        this.heardSound$.set(false);
        if (this.current === rec) this.current = null;
        fn();
      };
      rec.onstart = () => this.listening$.set(true);
      rec.onsoundstart = () => { heardSound = true; this.heardSound$.set(true); };
      rec.onspeechstart = () => { heardSound = true; this.heardSound$.set(true); };
      rec.onresult = (e: any) => {
        const out: string[] = [];
        try {
          for (let ri = 0; ri < e.results.length; ri++)
            for (let ai = 0; ai < e.results[ri].length; ai++) out.push(e.results[ri][ai].transcript);
        } catch { /* ignore malformed result */ }
        if (!out.length) return;
        gotResult = out;
        finish(() => resolve(out));
        try { rec.stop(); } catch { /* ignore */ }
      };
      rec.onerror = (e: any) => {
        const code = e?.error ?? 'mic-error';
        if (code === 'aborted' || code === 'not-allowed' || code === 'service-not-allowed'
            || code === 'network' || code === 'language-not-supported') {
          finish(() => reject(new Error(code)));
          return;
        }
        // 'no-speech' and others: wait for onend + grace period before deciding.
        lastError = code;
      };
      rec.onend = () => {
        if (settled) return;
        setTimeout(() => {
          if (settled) return;
          if (gotResult) { finish(() => resolve(gotResult as string[])); return; }
          if (heardSound) finish(() => reject(new Error('unclear')));
          else finish(() => reject(new Error(lastError || 'nospeech')));
        }, graceMs);
      };
      try { rec.start(); } catch (err) { finish(() => reject(err as Error)); }
    });
  }
}
