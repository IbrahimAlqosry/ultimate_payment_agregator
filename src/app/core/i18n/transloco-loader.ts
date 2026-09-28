import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

/** The content hash Angular put in this build's `main-XXXX.js` ('' on the dev server, which
 * serves an unhashed main.js). i18n/*.json aren't content-hashed, and an earlier IIS config
 * cached them for 365 days — browsers still holding that copy never re-request the plain URL,
 * so new keys render raw (e.g. "nav.deliveryRecovery"). Tagging the URL per build sidesteps
 * any such stale entry; both servers now also send no-cache for i18n (web.config, nginx). */
const BUILD_TAG =
  document.querySelector<HTMLScriptElement>('script[src*="main-"]')?.src.match(/main-([\w-]+)\.js/)?.[1] ?? '';

@Injectable({ providedIn: 'root' })
export class AppTranslocoLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    const url = new URL(`i18n/${lang}.json`, document.baseURI);
    if (BUILD_TAG) {
      url.searchParams.set('v', BUILD_TAG);
    }
    return this.http.get<Translation>(url.toString());
  }
}
