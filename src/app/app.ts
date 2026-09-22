import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { ProgressStore } from './core/services/progress.store';
import { TtsService } from './core/services/tts.service';
import { SettingsService } from './core/services/settings.service';
import { ApiKeyBarComponent } from './features/lesson/api-key-bar/api-key-bar.component';

@Component({
  imports: [RouterOutlet, ApiKeyBarComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  store = inject(ProgressStore);
  tts = inject(TtsService);
  settings = inject(SettingsService);
  sw = inject(SwUpdate, { optional: true });
  private router = inject(Router);
  updateReady$ = signal(false);
  routePath$ = signal<string>(this.router.url || '/welcome');
  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.routePath$.set(e.urlAfterRedirects);
        this.tts.stop();
        window.scrollTo({ top: 0 });
      });
    this.sw?.versionUpdates.subscribe((e) => {
      if (e.type === 'VERSION_READY') this.updateReady$.set(true);
    });
  }
  reload(): void {
    document.location.reload();
  }
  stages = [
    { name: 'Chọn chủ đề', steps: '1–2' },
    { name: 'Từ mới hôm nay', steps: '3' },
    { name: 'Luyện đọc từ', steps: '4' },
    { name: 'Câu chuyện', steps: '5' },
    { name: 'Luyện đọc câu', steps: '6' },
    { name: 'Đố vui', steps: '7–8' },
    { name: 'Tổng kết', steps: '9' }
  ];
  railIndexFromUrl(url: string): number {
    const path = url.split('?')[0];
    if (path.startsWith('/result')) return 6;
    if (path.startsWith('/learn/quiz')) return 5;
    if (path.startsWith('/learn/sentences')) return 4;
    if (path.startsWith('/learn/story')) return 3;
    if (path.startsWith('/learn/words')) return 2;
    if (path.startsWith('/learn')) return 1;
    return 0;
  }
  railClass(i: number): string {
    const cur = this.railIndexFromUrl(this.routePath$());
    if (i < cur) return 'done';
    if (i === cur) return 'now';
    return '';
  }
}
