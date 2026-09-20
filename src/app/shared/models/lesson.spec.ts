import { FALLBACK_LESSON } from './fallback-lesson';
describe('fallback lesson', () => {
  it('has 3 vocab and 5 quiz', () => {
    expect(FALLBACK_LESSON.vocab.length).toBe(3);
    expect(FALLBACK_LESSON.quiz.length).toBe(5);
    expect(FALLBACK_LESSON.story.english.length).toBe(3);
  });
});
