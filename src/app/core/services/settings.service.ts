import { Injectable, signal } from '@angular/core';
const KEY = 'emily_gemini_key';
const MODEL_KEY = 'emily_gemini_model';
const NAME_KEY = 'emily_kid_name';
export const DEFAULT_MODEL = 'gemini-flash-lite-latest';
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly key$ = signal<string>(typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) ?? '' : '');
  readonly model$ = signal<string>(typeof localStorage !== 'undefined' ? localStorage.getItem(MODEL_KEY) ?? DEFAULT_MODEL : DEFAULT_MODEL);
  getKey(): string { return this.key$(); }
  setKey(k: string): void {
    const v = k.trim();
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, v);
    this.key$.set(v);
  }
  clearKey(): void {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
    this.key$.set('');
  }
  getModel(): string { return this.model$() || DEFAULT_MODEL; }
  setModel(m: string): void {
    const v = m.trim() || DEFAULT_MODEL;
    if (typeof localStorage !== 'undefined') localStorage.setItem(MODEL_KEY, v);
    this.model$.set(v);
  }
  readonly kidName$ = signal<string>(typeof localStorage !== 'undefined' ? localStorage.getItem(NAME_KEY) ?? '' : '');
  getKidName(): string { return this.kidName$(); }
  setKidName(n: string): void {
    const v = n.trim().slice(0, 30);
    if (typeof localStorage !== 'undefined') {
      if (v) localStorage.setItem(NAME_KEY, v);
      else localStorage.removeItem(NAME_KEY);
    }
    this.kidName$.set(v);
  }
  /** Student's name, or neutral fallback before it's known. */
  kidOr(fallback = 'bạn'): string { return this.kidName$() || fallback; }
}
