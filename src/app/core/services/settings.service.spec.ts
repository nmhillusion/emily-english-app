import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';
describe('SettingsService', () => {
  it('persists key to localStorage', () => {
    const s = TestBed.configureTestingModule({}).inject(SettingsService);
    s.setKey('ABC123');
    expect(localStorage.getItem('emily_gemini_key')).toBe('ABC123');
    expect(s.getKey()).toBe('ABC123');
    s.clearKey();
    expect(s.getKey()).toBe('');
  });
  it('defaults model to flash-lite-latest and persists override', () => {
    const s = TestBed.configureTestingModule({}).inject(SettingsService);
    expect(s.getModel()).toContain('flash-lite');
    s.setModel('gemini-3.5-flash-lite');
    expect(localStorage.getItem('emily_gemini_model')).toBe('gemini-3.5-flash-lite');
    expect(s.getModel()).toBe('gemini-3.5-flash-lite');
    s.setModel('gemini-flash-lite-latest');
  });
  it('persists the kid name with neutral fallback', () => {
    const s = TestBed.configureTestingModule({}).inject(SettingsService);
    s.setKidName('  Minh Anh  ');
    expect(localStorage.getItem('emily_kid_name')).toBe('Minh Anh');
    expect(s.getKidName()).toBe('Minh Anh');
    expect(s.kidOr()).toBe('Minh Anh');
    s.setKidName('');
    expect(s.kidOr()).toBe('bạn');
    expect(localStorage.getItem('emily_kid_name')).toBeNull();
  });
});
