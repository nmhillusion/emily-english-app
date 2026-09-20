import { Component, effect, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { ProgressStore } from './core/services/progress.store';
import { TtsService } from './core/services/tts.service';
import { SettingsService } from './core/services/settings.service';
import { ApiKeyBarComponent } from './features/lesson/api-key-bar/api-key-bar.component';
import { TopicPickerComponent } from './features/lesson/topic-picker/topic-picker.component';
import { VocabIntroComponent } from './features/lesson/vocab-intro/vocab-intro.component';
import { WordPracticeComponent } from './features/lesson/word-practice/word-practice.component';
import { StoryViewComponent } from './features/lesson/story-view/story-view.component';
import { SentencePracticeComponent } from './features/lesson/sentence-practice/sentence-practice.component';
import { QuizStepComponent } from './features/lesson/quiz-step/quiz-step.component';
import { ResultViewComponent } from './features/lesson/result-view/result-view.component';

@Component({
  imports: [ApiKeyBarComponent, TopicPickerComponent, VocabIntroComponent, WordPracticeComponent, StoryViewComponent, SentencePracticeComponent, QuizStepComponent, ResultViewComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  store = inject(ProgressStore);
  tts = inject(TtsService);
  settings = inject(SettingsService);
  sw = inject(SwUpdate, { optional: true });
  updateReady$ = signal(false);
  constructor() {
    // Never let an old reading bleed into the next round.
    effect(() => { this.store.stage(); this.tts.stop(); });
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
  railClass(i: number): string {
    if (i < this.store.stage()) return 'done';
    if (i === this.store.stage()) return 'now';
    return '';
  }
}
