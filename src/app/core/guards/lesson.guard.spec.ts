import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { lessonGuard } from './lesson.guard';
import { ProgressStore } from '../services/progress.store';

@Component({ standalone: true, template: '' })
class BlankCmp {}

describe('lessonGuard', () => {
  it('redirects to /start when no lesson', async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'start', component: BlankCmp }])],
    }).compileComponents();
    TestBed.inject(ProgressStore).lesson.set(null);
    const result = TestBed.runInInjectionContext(() =>
      lessonGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(String(result)).toContain('/start');
  });

  it('allows activation when lesson exists', async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'start', component: BlankCmp }])],
    }).compileComponents();
    TestBed.inject(ProgressStore).lesson.set({
      topic_emoji: '🧪',
      vocab: [
        { word: 'a', phonetics: 'a', meaning: 'a', emoji: '🐶', tip: '' },
        { word: 'b', phonetics: 'b', meaning: 'b', emoji: '🐱', tip: '' },
        { word: 'c', phonetics: 'c', meaning: 'c', emoji: '🐭', tip: '' },
      ],
      story: { title: 'T', full_english: 'Hi', full_vietnamese: 'Chào', english: [], vietnamese: [], notes: [] },
      quiz: [],
    });
    const result = TestBed.runInInjectionContext(() =>
      lessonGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(result).toBe(true);
    TestBed.inject(ProgressStore).lesson.set(null);
  });
});
