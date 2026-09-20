import { TestBed } from '@angular/core/testing';
import { ProgressStore } from './progress.store';
describe('ProgressStore', () => {
  it('starts at stage 0', () => {
    const s = TestBed.configureTestingModule({}).inject(ProgressStore);
    expect(s.stage()).toBe(0);
  });
});
