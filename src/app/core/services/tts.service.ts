import { Injectable, signal } from '@angular/core';
const FEMALE = ['hoai my','hoài my','zira','jenny','samantha','google us english','google uk english female','google tiếng việt'];
const MALE = ['male','nam','david','mark','daniel'];
const VOICE_KEYS = { en: 'emily_tts_voice_en', vi: 'emily_tts_voice_vi' } as const;
type TtsLang = 'en' | 'vi';
@Injectable({ providedIn: 'root' })
export class TtsService {
  readonly talking = signal(false);
  readonly voices$ = signal<SpeechSynthesisVoice[]>([]);
  readonly voiceEn$ = signal<string>(typeof localStorage !== 'undefined' ? localStorage.getItem(VOICE_KEYS.en) ?? '' : '');
  readonly voiceVi$ = signal<string>(typeof localStorage !== 'undefined' ? localStorage.getItem(VOICE_KEYS.vi) ?? '' : '');
  constructor() {
    if (typeof speechSynthesis !== 'undefined') {
      const load = () => {
        const vs = speechSynthesis.getVoices();
        if (vs.length) this.voices$.set(vs);
      };
      load(); speechSynthesis.onvoiceschanged = load;
      if (typeof document !== 'undefined') {
        const gesture = () => this.warmup();
        document.addEventListener('pointerdown', gesture, { once: true });
        document.addEventListener('keydown', gesture, { once: true });
      }
    }
  }
  private warmed = false;
  /** Force the browser (notably Edge) to fetch online voices. Silent, safe to call repeatedly. */
  warmup(): void {
    if (this.warmed || typeof speechSynthesis === 'undefined') return;
    this.warmed = true;
    try {
      const u = new SpeechSynthesisUtterance('.');
      u.volume = 0; u.rate = 2;
      speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }
  voicesFor(lang: TtsLang): SpeechSynthesisVoice[] {
    return this.voices$().filter(v => (v.lang || '').toLowerCase().startsWith(lang));
  }
  /** True on Microsoft Edge (desktop or Android), where voice listing is unreliable. */
  browserIsEdge(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Edg\//i.test(navigator.userAgent || '');
  }
  /** Re-sync voices on demand (e.g. after using Read Aloud). Returns the count found. */
  reloadVoices(): number {
    if (typeof speechSynthesis === 'undefined') return 0;
    this.warmup();
    const vs = speechSynthesis.getVoices();
    if (vs.length) this.voices$.set(vs);
    return this.voices$().length;
  }
  getVoice(lang: TtsLang): string { return lang === 'en' ? this.voiceEn$() : this.voiceVi$(); }
  setVoice(lang: TtsLang, uri: string): void {
    const v = (uri || '').trim();
    if (typeof localStorage !== 'undefined') {
      if (v) localStorage.setItem(VOICE_KEYS[lang], v);
      else localStorage.removeItem(VOICE_KEYS[lang]);
    }
    if (lang === 'en') this.voiceEn$.set(v); else this.voiceVi$.set(v);
  }
  private pick(lang: TtsLang): SpeechSynthesisVoice | null {
    const pool = this.voicesFor(lang);
    if (!pool.length) return null;
    const saved = this.getVoice(lang);
    if (saved) {
      const match = pool.find(v => v.voiceURI === saved);
      if (match) return match;
    }
    const score = (v: SpeechSynthesisVoice) => {
      const n = (v.name + ' ' + v.voiceURI).toLowerCase();
      let s = 0;
      if (FEMALE.some(h => n.includes(h))) s += 10;
      if (MALE.some(h => n.includes(h))) s -= 10;
      return s;
    };
    return [...pool].sort((a, b) => score(b) - score(a))[0] ?? null;
  }
  /** Test seam + external picker: strict same-language voice or null. */
  pickVoice(lang: TtsLang): SpeechSynthesisVoice | null { return this.pick(lang); }
  /** Split Vietnamese text on 'quoted' English segments for mid-sentence voice switching. */
  splitMixed(text: string): { text: string; lang: TtsLang }[] {
    const parts: { text: string; lang: TtsLang }[] = [];
    const re = /'([^']+)'/g;
    let last = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push({ text: text.slice(last, m.index), lang: 'vi' });
      const inner = m[1].trim();
      if (inner) parts.push({ text: inner, lang: 'en' });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ text: text.slice(last), lang: 'vi' });
    if (!parts.length) parts.push({ text, lang: 'vi' });
    return parts.filter(p => p.text.trim().length > 0);
  }
  /** Speak Vietnamese text, switching to the English voice for 'quoted' words. */
  speakViMixed(text: string, rate: 0.9 | 0.3 = 0.9): void {
    for (const p of this.splitMixed(text)) this.speak(p.text, { lang: p.lang, rate });
  }
  private buildUtterance(text: string, opts: { lang?: 'en' | 'vi'; rate?: 0.9 | 0.3; onend?: () => void }): SpeechSynthesisUtterance {
    const u = new SpeechSynthesisUtterance(text);
    const v = this.pick(opts.lang ?? 'en');
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = opts.lang === 'vi' ? 'vi-VN' : 'en-US';
    u.pitch = 1.0; u.rate = opts.rate ?? 0.9;
    const done = opts.onend;
    u.onend = u.onerror = () => { this.talking.set(false); if (done) { try { done(); } catch { /* ignore */ } } };
    return u;
  }
  private queue: { text: string; opts: { lang?: 'en' | 'vi'; rate?: 0.9 | 0.3; onend?: () => void } }[] = [];
  private speaking = false;
  private gen = 0;
  speak(text: string, opts: { lang?: 'en' | 'vi'; rate?: 0.9 | 0.3; onend?: () => void } = {}): void {
    if (typeof speechSynthesis === 'undefined' || !text) return;
    this.queue.push({ text, opts });
    this.pump();
  }
  private pump(): void {
    if (this.speaking || typeof speechSynthesis === 'undefined') return;
    const item = this.queue.shift();
    if (!item) return;
    const g = this.gen;
    const fresh = speechSynthesis.getVoices();
    if (fresh.length) this.voices$.set(fresh);
    else this.warmup();
    const u = this.buildUtterance(item.text, { ...item.opts, onend: () => {
      if (g !== this.gen) return;
      this.speaking = false;
      try { item.opts.onend?.(); } catch { /* ignore */ }
      this.pump();
    }});
    this.speaking = true;
    this.talking.set(true);
    try { speechSynthesis.speak(u); }
    catch { this.speaking = false; this.talking.set(false); this.pump(); }
  }
  stop(): void {
    this.gen++;
    this.queue.length = 0;
    this.speaking = false;
    if (typeof speechSynthesis !== 'undefined') { try { speechSynthesis.cancel(); } catch { /* ignore */ } }
    this.talking.set(false);
  }
}
