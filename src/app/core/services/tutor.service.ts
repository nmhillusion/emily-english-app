import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';
import { LessonService } from './lesson.service';
import type { QuizItem } from '../../shared/models/lesson';

@Injectable({ providedIn: 'root' })
export class TutorService {
  private settings = inject(SettingsService);
  private lessons = inject(LessonService);

  /** Cô Emily's warm review of the quiz. Null when unreachable (caller shows error + retry). */
  async quizReview(quiz: QuizItem[], answers: (number | undefined)[]): Promise<string | null> {
    const key = this.settings.getKey();
    if (!key || !quiz.length) return null;
    const kid = this.settings.getKidName();
    const lines = quiz.map((q, i) => {
      const pick = answers[i];
      return `Câu ${i + 1}: ${q.question} | Đáp án đúng: ${q.options[q.correct]} | Bé chọn: ${pick === undefined ? 'bỏ trống' : q.options[pick]} | Giải thích: ${q.explanation}`;
    });
    const prompt = ['Bạn là Cô Emily, gia sư tiếng Anh dịu dàng cho học sinh tiểu học Việt Nam (6–11 tuổi), xưng "cô"' + (kid ? `, gọi học sinh bằng tên "${kid}", không dùng từ "bé".` : '.'),
      `Dưới đây là kết quả bài đố vui của ${kid || 'bé'}:`,
      ...lines,
      'Hãy viết 1 đoạn ngắn (dưới 80 từ tiếng Việt): tuyên dương các câu làm đúng, động viên nhẹ nhàng các câu sai và dặn ôn lại đúng 1 điểm yếu nhất. Mọi từ/cụm tiếng Anh trong đoạn văn luôn đặt trong dấu nháy đơn \'...\'. Chỉ trả về đoạn văn, không thêm gì khác.'].join('\n');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${this.lessons.buildUrl()}?key=${encodeURIComponent(key)}`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
      return text || null;
    } catch { return null; }
    finally { clearTimeout(t); }
  }
}
