import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { WelcomeComponent } from './welcome.component';

@Component({ standalone: true, template: '' })
class BlankCmp {}

describe('WelcomeComponent', () => {
  it('renders start button and navigates to /start', async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeComponent],
      providers: [provideRouter([{ path: 'start', component: BlankCmp }])],
    }).compileComponents();
    const fixture = TestBed.createComponent(WelcomeComponent);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button.go');
    expect(btn?.textContent).toContain('Bắt đầu');
    await fixture.componentInstance.start();
    expect(TestBed.inject(Router).url).toBe('/start');
  });
});
