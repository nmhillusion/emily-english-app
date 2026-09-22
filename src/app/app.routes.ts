import { Routes } from '@angular/router';
import { WelcomeComponent } from './features/welcome/welcome.component';
import { TopicPickerComponent } from './features/lesson/topic-picker/topic-picker.component';
import { LearnShellComponent } from './features/learn/learn-shell.component';
import { VocabIntroComponent } from './features/lesson/vocab-intro/vocab-intro.component';
import { WordPracticeComponent } from './features/lesson/word-practice/word-practice.component';
import { StoryViewComponent } from './features/lesson/story-view/story-view.component';
import { SentencePracticeComponent } from './features/lesson/sentence-practice/sentence-practice.component';
import { QuizStepComponent } from './features/lesson/quiz-step/quiz-step.component';
import { ResultViewComponent } from './features/lesson/result-view/result-view.component';
import { lessonGuard } from './core/guards/lesson.guard';

export const routes: Routes = [
  { path: 'welcome', component: WelcomeComponent },
  { path: 'start', component: TopicPickerComponent },
  {
    path: 'learn',
    component: LearnShellComponent,
    canActivate: [lessonGuard],
    children: [
      { path: 'vocab', component: VocabIntroComponent },
      { path: 'words', component: WordPracticeComponent },
      { path: 'story', component: StoryViewComponent },
      { path: 'sentences', component: SentencePracticeComponent },
      { path: 'quiz', component: QuizStepComponent },
      { path: '', redirectTo: 'vocab', pathMatch: 'full' },
    ],
  },
  { path: 'result', component: ResultViewComponent, canActivate: [lessonGuard] },
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
  { path: '**', redirectTo: 'welcome' },
];
