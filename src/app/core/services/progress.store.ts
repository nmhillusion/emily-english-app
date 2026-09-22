import { Injectable, signal } from '@angular/core';
import { Lesson } from '../../shared/models/lesson';
@Injectable({ providedIn: 'root' })
export class ProgressStore {
  /** @deprecated Router URL is now the outer truth (see app.routes.ts); kept for back-compat during migration. */
  readonly stage = signal(0);
  readonly topic = signal('');
  readonly lesson = signal<Lesson | null>(null);
  readonly wordIdx = signal(0);
  readonly sentIdx = signal(0);
  readonly qIdx = signal(0);
  readonly answers = signal<(number | undefined)[]>([]);
  go(n: number): void { this.stage.set(n); window.scrollTo({ top: 0 }); }
}
