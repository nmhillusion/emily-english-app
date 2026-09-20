import { Injectable, signal } from '@angular/core';
import type { Lesson } from '../../shared/models/lesson';

export interface WordHistory { subject: string; words: string[]; updatedAt: number; }
export interface LessonRecord { id?: number; topic: string; lesson: Lesson; score?: number; at: number; }

const DB_NAME = 'emily-db';
const DB_VERSION = 1;
const WORD_STORE = 'word-history';
const LESSON_STORE = 'lessons';
const MAX_USED_PER_TOPIC = 30;
const LEGACY_PREFIX = 'emily_used_words_';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  /** 'indexeddb' in real browsers, 'memory' when unavailable (private mode, tests). */
  readonly backend$ = signal<'indexeddb' | 'memory'>(typeof indexedDB === 'undefined' ? 'memory' : 'indexeddb');
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase | null> | null = null;
  private memWords = new Map<string, WordHistory>();
  private memLessons: LessonRecord[] = [];
  private memId = 0;

  norm(topic: string): string {
    return topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  }

  private open(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') { this.backend$.set('memory'); return Promise.resolve(null); }
    if (!this.dbReady) {
      this.dbReady = new Promise((resolve) => {
        try {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(WORD_STORE)) db.createObjectStore(WORD_STORE, { keyPath: 'subject' });
            if (!db.objectStoreNames.contains(LESSON_STORE)) db.createObjectStore(LESSON_STORE, { keyPath: 'id', autoIncrement: true });
          };
          req.onsuccess = () => { this.db = req.result; resolve(req.result); };
          req.onerror = () => { this.backend$.set('memory'); resolve(null); };
          req.onblocked = () => { this.backend$.set('memory'); resolve(null); };
        } catch { this.backend$.set('memory'); resolve(null); }
      });
    }
    return this.dbReady;
  }

  private async tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    if (!db) throw new Error('no-idb');
    return new Promise<T>((resolve, reject) => {
      try {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('idb-error'));
      } catch (e) { reject(e); }
    });
  }

  /** One-time migration of a legacy localStorage entry for this subject. */
  private migrateLegacy(subject: string): string[] {
    if (typeof localStorage === 'undefined') return [];
    const key = LEGACY_PREFIX + subject;
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? '[]');
      const words = Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
      localStorage.removeItem(key);
      localStorage.removeItem('emily_used_words');
      return words;
    } catch { return []; }
  }

  async getUsedWords(topic: string): Promise<string[]> {
    const subject = this.norm(topic);
    if (!subject) return [];
    try {
      const rec = await this.tx<WordHistory | undefined>(WORD_STORE, 'readonly', s => s.get(subject));
      return rec?.words ?? this.migrateLegacy(subject);
    } catch {
      return this.memWords.get(subject)?.words ?? this.migrateLegacy(subject);
    }
  }

  async addUsedWords(topic: string, words: string[]): Promise<void> {
    const subject = this.norm(topic);
    const fresh = words.map(w => String(w).trim()).filter(Boolean);
    if (!subject || !fresh.length) return;
    try {
      const prev = await this.tx<WordHistory | undefined>(WORD_STORE, 'readonly', s => s.get(subject));
      const merged = [...(prev?.words ?? []), ...this.migrateLegacy(subject), ...fresh];
      const rec: WordHistory = { subject, words: [...new Set(merged)].slice(-MAX_USED_PER_TOPIC), updatedAt: Date.now() };
      await this.tx(WORD_STORE, 'readwrite', s => s.put(rec));
    } catch {
      const prev = this.memWords.get(subject)?.words ?? [...this.migrateLegacy(subject)];
      const merged = [...prev, ...fresh];
      this.memWords.set(subject, { subject, words: [...new Set(merged)].slice(-MAX_USED_PER_TOPIC), updatedAt: Date.now() });
    }
  }

  async saveLesson(topic: string, lesson: Lesson, score?: number): Promise<number | null> {
    const rec: LessonRecord = { topic, lesson, score, at: Date.now() };
    try {
      return await this.tx<number>(LESSON_STORE, 'readwrite', s => s.add(rec) as unknown as IDBRequest<number>);
    } catch {
      this.memId += 1;
      this.memLessons.push({ ...rec, id: this.memId });
      return this.memId;
    }
  }

  async recentLessons(limit = 20): Promise<LessonRecord[]> {
    try {
      const db = await this.open();
      if (!db) throw new Error('no-idb');
      return await new Promise<LessonRecord[]>((resolve, reject) => {
        try {
          const out: LessonRecord[] = [];
          const t = db.transaction(LESSON_STORE, 'readonly');
          const cursor = t.objectStore(LESSON_STORE).openCursor(null, 'prev');
          cursor.onsuccess = () => {
            const c = cursor.result;
            if (c && out.length < limit) { out.push(c.value); c.continue(); }
            else resolve(out);
          };
          cursor.onerror = () => reject(cursor.error ?? new Error('idb-error'));
        } catch (e) { reject(e); }
      });
    } catch {
      return this.memLessons.slice(-limit).reverse();
    }
  }

  async clearHistory(): Promise<void> {
    this.memWords.clear();
    this.memLessons = [];
    try {
      const db = await this.open();
      if (!db) return;
      await Promise.all([WORD_STORE, LESSON_STORE].map(store => new Promise<void>((resolve, reject) => {
        try {
          const t = db.transaction(store, 'readwrite');
          const req = t.objectStore(store).clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error ?? new Error('idb-error'));
        } catch (e) { reject(e); }
      })));
    } catch { /* memory already cleared */ }
  }
}
