import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ProgressStore } from '../services/progress.store';

export const lessonGuard: CanActivateFn = () => {
  const store = inject(ProgressStore);
  const router = inject(Router);
  return store.lesson() ? true : router.parseUrl('/start');
};
