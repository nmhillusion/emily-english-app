export interface Vocab { word: string; phonetics: string; meaning: string; emoji: string; tip: string; }
export interface Story { title: string; full_english: string; full_vietnamese: string;
  english: string[]; vietnamese: string[]; notes: string[]; }
export interface QuizItem { question: string; options: [string, string, string];
  correct: 0 | 1 | 2; hint: string; explanation: string; }
export interface Lesson { topic_emoji: string; vocab: [Vocab, Vocab, Vocab]; story: Story; quiz: QuizItem[]; }
