import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  template: `<div class="card" style="text-align:center">
    <div class="bigpic" aria-hidden="true">👩‍🏫</div>
    <h1 class="display" style="font-size:34px;margin:8px 0 4px">Cô Emily</h1>
    <p class="muted" style="margin:0 0 18px">Lớp tiếng Anh vui vẻ</p>
    <button class="btn big go" (click)="start()">Bắt đầu 🎒</button>
  </div>`,
})
export class WelcomeComponent {
  private router = inject(Router);
  start(): Promise<boolean> {
    return this.router.navigate(['/start']);
  }
}
