import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails } from '@core/models.platform';

/** Translation key for the shared guard "we don't have the record's concurrencyToken yet, so
 * submitting would just fail server-side" — shown before ever making the request, so it's not a
 * ProblemDetails response and doesn't go through apiErrorMessageKey(). A key (not a literal
 * string) so it renders correctly in both languages, same as every other user-facing error. */
export const MISSING_CONCURRENCY_TOKEN_KEY = 'apiError.missingConcurrencyToken';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  /** Field-to-message-array validation errors, present on some real-backend `400`s. */
  fieldErrors?: Record<string, string[]>;
}

function isProblemDetails(body: unknown): body is ProblemDetails {
  return !!body && typeof body === 'object' && 'title' in body && 'status' in body;
}

/** Every server-derived error shown to a user must be translated — the real backend has no
 * localization of its own (confirmed live: identical `title`/`detail` regardless of
 * `Accept-Language`), so its freeform `detail` text can't be trusted as display copy. This maps
 * the one thing the backend *does* give us authoritatively — the HTTP status — to a translation
 * key, rather than ever rendering `readApiError(...).message` (backend English) directly. */
export function apiErrorMessageKey(error: unknown): string {
  switch (readApiError(error).status) {
    case 400:
      return 'apiError.badRequest';
    case 401:
      return 'apiError.unauthorized';
    case 403:
      return 'apiError.forbidden';
    case 404:
      return 'apiError.notFound';
    case 409:
      return 'apiError.conflict';
    case 413:
      return 'apiError.payloadTooLarge';
    case 415:
      return 'apiError.unsupportedMedia';
    case 422:
      return 'apiError.unprocessable';
    case 423:
      return 'apiError.locked';
    case 501:
      return 'apiError.notImplemented';
    case 503:
      return 'apiError.serviceUnavailable';
    default:
      return 'apiError.generic';
  }
}

export function readApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ProblemDetails | { message?: unknown; code?: unknown } | string | null;

    if (isProblemDetails(body)) {
      return {
        status: error.status,
        message: body.detail || body.title || error.statusText || 'Request failed',
        code: body.traceId,
        fieldErrors: body.errors,
      };
    }

    const fromBody =
      body && typeof body === 'object' && 'message' in body && body.message != null ? String(body.message) : null;
    const code = body && typeof body === 'object' && 'code' in body && body.code != null ? String(body.code) : undefined;
    return {
      status: error.status,
      message: fromBody || error.statusText || 'Request failed',
      code,
    };
  }

  return { status: 0, message: 'Request failed' };
}
