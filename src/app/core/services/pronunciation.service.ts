import { Injectable, inject, signal } from '@angular/core';
import { SettingsService } from './settings.service';
import { LessonService } from './lesson.service';
import { MicService } from './mic.service';

export interface Assessment {
  score: number; heard: string; badParts: string[]; tipVi: string; pass: boolean;
}
export type AudioPhase = 'idle' | 'recording' | 'analyzing';

const PASS_SCORE = 70;

@Injectable({ providedIn: 'root' })
export class PronunciationService {
  private settings = inject(SettingsService);
  private lessons = inject(LessonService);
  private mic = inject(MicService);
  readonly phase$ = signal<AudioPhase>('idle');
  readonly elapsedMs$ = signal(0);
  /** Reason the last assessAudio fell back ('model-audio' when the model rejects audio input). */
  readonly assessIssue$ = signal('');
  private recorder: any = null;
  private stream: any = null;
  private chunks: Blob[] = [];
  private timer: any = null;
  private stopResolve: ((b: Blob) => void) | null = null;

  /** True when the full audio pipeline can run (key + browser capture). */
  audioReady(): boolean {
    return !!this.settings.getKey()
      && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
      && typeof (window as any).MediaRecorder !== 'undefined';
  }

  buildAssessmentPrompt(target: string, phonetics: string): string {
    const kid = this.settings.getKidName();
    const addr = kid ? ` Học sinh tên là "${kid}" — trong tip_vi gọi em bằng tên, không dùng từ "bé".` : '';
    return ['Bạn là Cô Emily, gia sư phát âm tiếng Anh cho học sinh tiểu học Việt Nam (6–11 tuổi).' + addr,
      `${kid || 'Bé'} vừa đọc to, file audio được đính kèm.`,
      `Từ/câu mục tiêu cần đọc: "${target}"` + (phonetics ? ` (phiên âm IPA: ${phonetics})` : '') + '.',
      'Hãy nghe kỹ phát âm và chỉ trả về JSON đúng cấu trúc:',
      '{"score": điểm phát âm tổng thể từ 0 đến 100, "heard": "đoạn bạn nghe được đã đọc", "bad_parts": ["các phần đọc sai, mỗi phần là 1 từ hoặc 1 âm tiết, tối đa 3 phần, mảng rỗng nếu đọc chuẩn"], "tip_vi": "1 lời khuyên cụ thể bằng tiếng Việt, giọng dịu dàng xưng cô' + (kid ? ` gọi "${kid}"` : '') + ', nêu rõ cách đặt miệng/lưỡi/lấy hơi để sửa phần sai nhất, dưới 40 từ", "pass": true nếu score từ 70 trở lên}',
      'Thang điểm bắt buộc (lời động viên chỉ viết trong tip_vi, KHÔNG cộng vào score):',
      '- Đọc thành từ/câu hoàn toàn khác mục tiêu: score dưới 30.',
      '- Đúng từ/câu nhưng còn lỗi phát âm rõ rệt: score từ 30 đến 69.',
      '- Đọc đúng và rõ mục tiêu: score từ 70 trở lên.',
      '"heard" phải ghi đúng từng chữ nghe được trong audio, kể cả khi khác hoàn toàn mục tiêu; tuyệt đối không sửa thành từ mục tiêu.',
      'Không thêm chữ nào ngoài JSON.'].join('\n');
  }

  parseAssessment(text: string): Assessment | null {
    try {
      const raw = JSON.parse(text);
      const score = Number(raw.score);
      const heard = String(raw.heard ?? '');
      const tipVi = String(raw.tip_vi ?? '').trim();
      if (!Number.isFinite(score) || score < 0 || score > 100) return null;
      if (!tipVi) return null;
      const badParts = Array.isArray(raw.bad_parts)
        ? raw.bad_parts.map((x: any) => String(x)).filter(Boolean).slice(0, 3) : [];
      return { score, heard, badParts, tipVi, pass: score >= PASS_SCORE };
    } catch { return null; }
  }

  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result ?? '');
        const i = url.indexOf(',');
        resolve(i >= 0 ? url.slice(i + 1) : url);
      };
      reader.onerror = () => reject(new Error('audio-encode'));
      reader.readAsDataURL(blob);
    });
  }

  private mapMicError(e: unknown): Error {
    const name = e instanceof DOMException ? e.name : (e as any)?.name ?? '';
    if (name === 'NotAllowedError' || name === 'SecurityError') return new Error('not-allowed');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return new Error('no-mic');
    return new Error('mic-error');
  }

  /** Start recording. Resolves only via stopRecording()/requestStop()/auto-stop. Throws on capture failure. */
  async record(maxMs = 8000): Promise<Blob> {
    this.cleanup();
    let stream: any;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { throw this.mapMicError(e); }
    this.stream = stream;
    const MR = (window as any).MediaRecorder;
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      .find(t => { try { return MR.isTypeSupported(t); } catch { return false; } }) ?? '';
    const rec = mime ? new MR(stream, { mimeType: mime }) : new MR(stream);
    this.recorder = rec;
    this.chunks = [];
    const done = new Promise<Blob>((resolve) => { this.stopResolve = resolve; });
    rec.ondataavailable = (e: any) => { if (e?.data && e.data.size) this.chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
      this.stopTimer();
      const fn = this.stopResolve;
      this.stopResolve = null;
      this.cleanup();
      if (fn) fn(blob);
    };
    const started = Date.now();
    this.elapsedMs$.set(0);
    this.timer = setInterval(() => this.elapsedMs$.set(Date.now() - started), 200);
    const autoStop = setTimeout(() => this.requestStop(), maxMs);
    try { rec.start(); } catch (e) { clearTimeout(autoStop); this.cleanup(); throw this.mapMicError(e); }
    this.phase$.set('recording');
    return done.finally(() => clearTimeout(autoStop));
  }

  requestStop(): void {
    try {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    } catch { /* resolve via onstop or timeout path */ }
  }

  private stopTimer(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private cleanup(): void {
    this.stopTimer();
    try { if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop(); } catch { /* ignore */ }
    this.recorder = null;
    try { this.stream?.getTracks?.().forEach((t: any) => t.stop()); } catch { /* ignore */ }
    this.stream = null;
    this.phase$.set('idle');
    this.elapsedMs$.set(0);
  }

  /** Best-effort browser transcript recorded in parallel (independent audit ear). '' when unavailable. */
  transcribeAudit(): Promise<string> {
    try {
      return this.mic.listenOnce().then(alts => alts[0] ?? '').catch(() => '');
    } catch { return Promise.resolve(''); }
  }

  /** Send recorded audio to Gemini. Returns null when unavailable or unparsable (caller fails loud). */
  async assessAudio(blob: Blob, target: string, phonetics: string, auditText = ''): Promise<Assessment | null> {
    const key = this.settings.getKey();
    if (!key || !blob || blob.size === 0) return null;
    let base64: string;
    try { base64 = await this.blobToBase64(blob); } catch { return null; }
    if (!base64) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    this.phase$.set('analyzing');
    this.assessIssue$.set('');
    try {
      const res = await fetch(`${this.lessons.buildUrl()}?key=${encodeURIComponent(key)}`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType: blob.type || 'audio/webm', data: base64 } },
            { text: this.buildAssessmentPrompt(target, phonetics) }
          ] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      if (!res.ok) {
        let errText = '';
        try { errText = JSON.stringify(await res.json()); } catch { /* ignore */ }
        if ((res.status === 400 || res.status === 404) && /audio|inlineData|multimodal|modality/i.test(errText)) {
          this.assessIssue$.set('model-audio');
        }
        return null;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const assessed = this.parseAssessment(text);
      if (!assessed) return null;
      // Deterministic guard against inflated scores: transcript clearly
      // mismatching the target can never pass, whatever the model claimed.
      if (assessed.heard && assessed.score > 50 && this.mic.sim(assessed.heard, target) < 0.4) {
        return { ...assessed, score: Math.min(assessed.score, 45), pass: false };
      }
      // Independent audit ear: the browser's own transcript disagrees with a pass.
      const audit = auditText.trim();
      if (audit && assessed.score > 50 && this.mic.sim(audit, target) < 0.4) {
        const kid = this.settings.kidOr();
        return { ...assessed, score: Math.min(assessed.score, 45), pass: false,
          tipVi: `Cô nghe chưa giống từ mục tiêu. ${kid} nghe mẫu chậm rồi đọc lại nhé.` };
      }
      return assessed;
    } catch { return null; }
    finally { clearTimeout(t); this.phase$.set('idle'); }
  }
}
