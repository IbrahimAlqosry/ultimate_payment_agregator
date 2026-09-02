import { ApplicationRef, computed, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type AppLang = 'en' | 'ar';

const LANG_KEY = 'aggregator.lang';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly transloco = inject(TranslocoService);
  private readonly appRef = inject(ApplicationRef);

  readonly lang = signal<AppLang>(this.readInitial());
  readonly isRtl = computed(() => this.lang() === 'ar');
  readonly dateLocale = computed(() => (this.lang() === 'ar' ? 'ar' : 'en-US'));

  constructor() {
    this.apply(this.lang());
    this.transloco.setActiveLang(this.lang());
    this.transloco.langChanges$.subscribe((lang) => {
      const next = lang === 'ar' ? 'ar' : 'en';
      this.lang.set(next);
      this.apply(next);
    });
  }

  setLang(lang: AppLang): void {
    localStorage.setItem(LANG_KEY, lang);
    this.lang.set(lang);
    this.apply(lang);
    this.transloco.setActiveLang(lang);
    this.appRef.tick();
  }

  private readInitial(): AppLang {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) : null;
    if (stored === 'ar' || stored === 'en') {
      return stored;
    }
    const browser = navigator.language?.toLowerCase() ?? 'en';
    return browser.startsWith('ar') ? 'ar' : 'en';
  }

  private apply(lang: AppLang): void {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
}
