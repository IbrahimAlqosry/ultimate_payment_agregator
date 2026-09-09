import { environment } from '@env/environment';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ENVIRONMENT_INITIALIZER,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { provideSignalFormsConfig } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { authInterceptor } from '@core/auth/auth.interceptor';
import { errorInterceptor } from '@core/http/error.interceptor';
import { loadingInterceptor } from '@core/http/loading.interceptor';
import { mockBackendInterceptor } from '@core/http/mock-backend.interceptor';
import { LocaleService } from '@core/i18n/locale.service';
import { TranslocoTitleStrategy } from '@core/i18n/page-title.strategy';
import { AppTranslocoLoader } from '@core/i18n/transloco-loader';
import { routes } from './app.routes';

/**
 * HTTP interceptor order (outer → inner on the request):
 * 1. loadingInterceptor — in-flight count for the top progress bar
 * 2. errorInterceptor — status pages + friendly error toasts
 * 3. authInterceptor — Bearer token on `environment.apiUrl`
 * 4. mockBackendInterceptor — only when `environment.useMockApi` is true
 */
const httpInterceptors = [
  loadingInterceptor,
  errorInterceptor,
  authInterceptor,
  ...(environment.useMockApi ? [mockBackendInterceptor] : []),
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: TranslocoTitleStrategy },
    provideHttpClient(withInterceptors(httpInterceptors)),
    provideSignalFormsConfig({
      classes: {
        'is-invalid': (binding) => binding.state().touched() && binding.state().invalid(),
      },
    }),
    ...provideTransloco({
      config: {
        availableLangs: [
          { id: 'en', label: 'English' },
          { id: 'ar', label: 'العربية' },
        ],
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: AppTranslocoLoader,
    }),
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        inject(LocaleService);
      },
    },
    // Runs before the initial route's guards evaluate — restores the session from a live
    // __Host-pa-session cookie after a reload, instead of every reload forcing a fresh login.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).restoreSession())),
  ],
};
